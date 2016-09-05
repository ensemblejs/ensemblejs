'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;
const now = require('present');
const {sortBy} = require('lodash');
const histogram = require('ascii-histogram');
const setFixedInterval = require('fixed-setinterval');

var logger = require('../../fake/logger');
import define from '../../../src/plugins/plug-n-play';
import {configure, plugin} from '../../../src/plugins/plug-n-play';
configure(logger);

let sequence = require('distributedlife-sequence');

define('Config', function Config() {
  return {
    client: {
      clientSidePrediction: true,
      physicsUpdateLoop: 15
    }
  };
});

var time = require('../../../src/core/shared/time').func();
define('Time', function Time () {
  return time;
});

var defer = require('../../support').defer;
var trackerPlugins = require('../../support').plugin();
var processPendingInputPlugins = require('../../support').plugin();
var inputQueuePlugins = require('../../support').plugin();
var frameStorePlugins = require('../../support').plugin();

var onClientStart = [];
var onOutgoingClientPacket = [];
var onIncomingServerPacket = [];
var beforePhysicsFrame = [];
var onPhysicsFrame = [];
var afterPhysicsFrame = [];
var actionMap = [];

require('../../../src/state/client/tracker').func(defer(trackerPlugins.define));
var mutator = require('../../../src/state/client/mutator').func(defer(logger));
var rawStateAccess = plugin('RawStateAccess');
var stateAccess = plugin('StateAccess');

const mode = 'default';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(time), defer(plugin('Config')));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

var trackerPluginsDeps = trackerPlugins.deps();
var currentState = trackerPluginsDeps.CurrentState();
onClientStart.push(trackerPluginsDeps.OnClientStart(defer(rawStateAccess)));
onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

var clientState = {
  get: () => {return false;}
};

var serverState = {
  get: () => {return false;}
};

var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(time), defer('default'));

var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onClientStart.push(frameStorePluginDeps.OnClientStart());

var startPhysicsEngine = require('../../../src/core/client/physics').func(defer(clientState), defer(serverState), defer(time), defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(mutator), defer(stateAccess), defer(mode), defer(plugin('Config')), defer(frameStore));
var stopPhysicsEngine = plugin('OnDisconnect');

function count (state) { return state.namespace.count; }

let startTimes = [];

function fib(n) {
  var a = 0, b = 1, t;
  while (n-- > 0) {
    t = a;
    a = b;
    b += t;
  }
  return a;
}

let blockedDuration = [];
function doHardWorkFor (duration) {
  const start = now();

  if (duration) {
    fib(duration);
  }

  blockedDuration.push(now() - start);
}

let frameCount = 0;
const originalFrameStoreProcess = frameStore.process;
frameStore.process = function countFrames (delta, runLogicOnFrame) {
  frameCount += 1;

  originalFrameStoreProcess(delta, runLogicOnFrame);
};

function logic (duration) {
  return function whileAwayTheHours (delta, state) {
    startTimes.push(now());

    doHardWorkFor(duration);

    return { namespace: { count: state.for('namespace').get('count') + 1 } };
  };
}

function sum (set) {
  return set.reduce((t, n) => t + n, 0);
}

function average (set) {
  return sum(set) / set.length;
}

function getPercentile (percentile, values) {
  if (values.length === 0) {
    return 0;
  }

  let i = (percentile/100) * values.length;

  if (Math.floor(i) === i) {
    return (values[i-1] + values[i])/2;
  }

  return values[Math.floor(i)];
}

function logDataAboutSamples (name, samples) {
  const sortedSamples = sortBy(samples);

  console.log(name);

  console.log(`50th ${getPercentile(50, sortedSamples)}ms`);
  console.log(`75th ${getPercentile(75, sortedSamples)}ms`);
  console.log(`95th ${getPercentile(95, sortedSamples)}ms`);
  console.log(`99th ${getPercentile(99, sortedSamples)}ms`);

  const asHistogram = [];
  samples.forEach(sample => {
    asHistogram[Math.round(sample)] = asHistogram[Math.round(sample)] || 0;
    asHistogram[Math.round(sample)] += 1;
  });

  console.log(histogram(asHistogram));
}

function data (size) {
  return {
    ensemble: { waitingForPlayers: false },
    namespace: { count: 0 },
    stuff: !size ? {} : Array(size).fill(1).map(() => Math.floor(Math.random() * 10)).join('')
  };
}

const MochaTimeout = 10000;
const aSecond = 1000;
const aMinute = 60;
const TestDuration = MochaTimeout - aSecond;

describe('Physics Frames Performance', function () {
  this.timeout(MochaTimeout);

  let next;

  before(() => {
    next = sinon.stub(sequence, 'next');
    for (let i = 0; i < 500000; i++) {
      next.onCall(i).returns(i + 1);
    }
  });

  beforeEach(() => {
    startTimes = [];
    blockedDuration = [];
  });

  after(() => {
    next.restore();
  });

  let permutations = [];

  const KB = 1000;
  const MB = 1000 * KB;

  const fxCounts = [1, 10];//, 100];//, 1000];
  const effort = ['trivial-ms', '5ms'];//, '10ms'];//, '15ms'];
  const dataSizes = ['minimal-', 1 * KB, 10 * KB, 100 * KB, 1 * MB];
  const serverStateInterval = [45, 100, 250, 500, 1000, 10000, 'never-'];

  const cycles = {
    '1-trivial-ms': 0,
    '10-trivial-ms': 0,
    '100-trivial-ms': 0,
    '1000-trivial-ms': 0,
    '1-5ms': 1900000,
    '10-5ms': 275000,
    '100-5ms': 25000,
    '1000-5ms': 3000,
    '1-10ms': 4500000,
    '10-10ms': 600000,
    '100-10ms': 55000,
    '1000-10ms': 8000,
    '1-15ms': 6500000,
    '10-15ms': 900000,
    '100-15ms': 95000,
    '1000-15ms': 10000
  };

  fxCounts.forEach(fx => {
    effort.forEach(totalMs => {
      dataSizes.forEach(kb => {
        serverStateInterval.forEach(interval => {
          const fibCycles = cycles[`${fx}-${totalMs}`];

          const name = `${fx} fx, ${totalMs}, ${kb} bytes, ${interval}ms server refresh`;

          permutations.push({
            name: name,
            code: Array(fx).fill(logic(fibCycles)),
            data: data(kb === 'minimal-' ? 0 : kb),
            fxCount: fx,
            serverRate: interval
          });
        });
      });
    });
  });

  console.log(`There are ${permutations.length} permutations. Settle in as this will take ${Math.ceil((permutations.length * TestDuration) / aSecond / aMinute)} minute(s).`);

  let results = [];

  permutations.forEach(permutation => {
    describe(`with ${permutation.name} logic`, () => {
      let start;
      let stop;

      before(done => {
        var initialState = permutation.data;

        each(onClientStart, cb => cb(initialState));

        frameCount = 0;

        permutation.code.forEach(code => (onPhysicsFrame.push(['*', code])));

        start = now();
        startPhysicsEngine();

        let stopPushServerState;
        if (permutation.serverRate !== 'never-') {
          stopPushServerState = setFixedInterval(() => {
            onIncomingServerPacket.forEach(cb => cb({
              saveState: permutation.data
            }));
          }, permutation.serverRate);
        }

        setTimeout(() => {
          stop = now();

          if (stopPushServerState) {
            stopPushServerState();
          }

          done();
        }, TestDuration);
      });

      after(() => {
        stopPhysicsEngine();
        permutation.code.forEach(() => (onPhysicsFrame.pop()));
      });

      it('should run at 60 fps or better', () => {
        // const frames2 = currentState.get(count);
        // console.log(frameCount, frames2);
        const durationInSeconds = (stop - start) / 1000;
        const fps = Math.floor(frameCount / durationInSeconds);

        results.push({name: permutation.name, fps: fps});

        expect(fps).toBeGreaterThanOrEqualTo(60);

        // console.log(`Running at ${fps}fps`);
      });

      it.skip('should call the physics loop every ~15ms', () => {
        let timeSincePrior = [];
        for(let i = 0; i < startTimes.length; i += 1) {
          if (i === 0) {
            continue;
          }

          timeSincePrior.push(startTimes[i] - startTimes[i - 1]);
        }

        // logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
        // logDataAboutSamples('Blocked (ms)', blockedDuration);

        expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);

        console.log(`Total blocked duration ${sum(blockedDuration)} for an average of ${average(blockedDuration)}`);
      });
    });
  });

  describe('And the results', () => {
    it('are in', () => {
      results.forEach(result => {
        const percent = Math.round(result.fps / 60 * 100);
        const padding = Array(3 - String(percent).split('').length).fill(' ').join('');

        console.log(`[${result.fps >= 60 ? '*' : ' '}][${padding}${percent}%][${result.fps} fps] ${result.name}`);
      });
    });
  });
});