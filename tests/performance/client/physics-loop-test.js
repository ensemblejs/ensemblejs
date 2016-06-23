'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;
const now = require('present');
const {sortBy} = require('lodash');
const histogram = require('ascii-histogram');
const chart = require('ascii-chart');
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

const theRealMutator = require('../../../src/state/client/mutator').func(defer(logger));
let mutatorTimeForFrame = 0;
function mutator (saveId, result) {
  const start = now();

  theRealMutator(saveId, result);

  mutatorTimeForFrame += now() - start;
}

var rawStateAccess = plugin('RawStateAccess');
var stateAccess = plugin('StateAccess');

const mode = 'default';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(time), defer(plugin('Config')));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

var trackerPluginsDeps = trackerPlugins.deps();
onClientStart.push(trackerPluginsDeps.OnClientStart(defer(rawStateAccess)));
onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

var clientState = { get: () => false };
var serverState = { get: () => false };

var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(time), defer('default'));

var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onClientStart.push(frameStorePluginDeps.OnClientStart());

var startPhysicsEngine = require('../../../src/core/client/physics').func(defer(clientState), defer(serverState), defer(time), defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(mutator), defer(stateAccess), defer(mode), defer(plugin('Config')), defer(frameStore));
var stopPhysicsEngine = plugin('OnDisconnect');

let startTimes = [];

let blockedDuration = [];
let framesProcessedThisFrame = 0;
function doHardWorkFor (duration) {
  const start = now();

  if (duration) {
    while (now() < start + duration);
  }

  blockedDuration.push(Math.round(now() - start));
  framesProcessedThisFrame += 1;
}

let frameCount = 0;
let frameStoreDurations = [];
let framesProcessed = [];
let totalGameDevTime = [];
let totalMutatorTime = [];
let gameDevTimeForFrame = 0;
const originalFrameStoreProcess = frameStore.process;
frameStore.process = function countFrames (delta, runLogicOnFrame) {
  frameCount += 1;
  gameDevTimeForFrame = 0;
  mutatorTimeForFrame = 0;

  const start = now ();

  originalFrameStoreProcess(delta, runLogicOnFrame);

  framesProcessed.push(framesProcessedThisFrame);
  framesProcessedThisFrame = 0;

  frameStoreDurations.push(Math.ceil(now() - start));
  totalGameDevTime.push(Math.ceil(gameDevTimeForFrame));
  totalMutatorTime.push(Math.ceil(mutatorTimeForFrame));
};

function logic (duration) {
  return function whileAwayTheHours (delta, state) {
    const start = now();

    startTimes.push(start);

    doHardWorkFor(duration);

    gameDevTimeForFrame += now() - start;
    return { namespace: { count: state.namespace.count + 1 } };
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

function barChart (name, samples) {
  console.log(name);

  console.log(chart(samples, { width: 250, height: 20 }));
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
    for (let i = 0; i < 50000; i++) {
      next.onCall(i).returns(i + 1);
    }
  });

  after(() => {
    next.restore();
  });

  let permutations = [];

  const KB = 1000;
  const MB = 1000 * KB;

  const fxCounts = [100];//1, 10, 100, 250, 500, 1000];
  const effort = ['5ms'];//trivial-ms', '5ms', '10ms', '15ms'];
  const dataSizes = ['minimal-'];//, 1 * KB, 10 * KB, 100 * KB, 1 * MB];
  const serverStateInterval = ['never-'];//, 5000, 1000, 500, 250, 100, 45];

  const totalDuration = {
    'trivial-ms': 0,
    '5ms': 5,
    '10ms': 10,
    '15ms': 15
  };

  fxCounts.forEach(fx => {
    effort.forEach(totalMs => {
      dataSizes.forEach(b => {
        serverStateInterval.forEach(interval => {
          let fEffort = totalDuration[totalMs];
          if (totalDuration[totalMs] > 0) {
            fEffort /= fx;
          }

          const name = `${fx} f(x), ${totalMs}, ${b}b, ${interval}ms server refresh`;

          permutations.push({
            name: name,
            code: Array(fx).fill(logic(fEffort)),
            data: data(b === 'minimal-' ? 0 : b),
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
        console.log(`Running ${permutation.name}`);

        var initialState = permutation.data;

        each(onClientStart, cb => cb(initialState));

        frameCount = 0;
        frameStoreDurations = [];
        framesProcessed = [];
        totalGameDevTime = [];
        totalMutatorTime = [];
        startTimes = [];
        blockedDuration = [];

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
        const durationInSeconds = (stop - start) / 1000;
        const fps = Math.floor(frameCount / durationInSeconds);

        results.push({name: permutation.name, fps: fps});

        // logDataAboutSamples('FrameStore.process duration (ms)', frameStoreDurations);

        let frameworkDuration = [];
        for (let i = 0; i < frameStoreDurations.length; i += 1) {
          frameworkDuration.push(frameStoreDurations[i] - totalGameDevTime[i]);
        }

        // barChart('Duration of FrameStore.process', frameStoreDurations);
        // barChart('Duration of GameDev Logic', totalGameDevTime);
        logDataAboutSamples('Duration of Framework Code', frameworkDuration);
        logDataAboutSamples('Duration of Mutator Code', totalMutatorTime);
        // barChart('f(x) processed per frame', framesProcessed);

        expect(fps).toBeGreaterThanOrEqualTo(60);
      });

      it('should call the physics loop every ~15ms', () => {
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