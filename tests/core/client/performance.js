'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;
const now = require('present');
const {sortBy} = require('lodash');
const histogram = require('ascii-histogram');

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

var mode = 'default';
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

function gameLogic (delta, state) {
  startTimes.push(new Date().getTime());

  return { namespace: { count: state.namespace.count + 1 } };
}

function fib(n) {
  var a = 0, b = 1, t;
  while (n-- > 0) {
    t = a;
    a = b;
    b += t;
  }
  return a;
}

const cycles = {
   5: 1900000,
  10: 4500000,
  15: 6500000
};

let blockedDuration = [];
function doHardWorkFor (duration) {
  const start = new Date().getTime();

  fib(cycles[duration]);

  blockedDuration.push(new Date().getTime() - start);
}

function gameLogic5ms (delta, state) {
  startTimes.push(new Date().getTime());

  doHardWorkFor(5);

  return { namespace: { count: state.namespace.count + 1 } };
}

function gameLogic10ms (delta, state) {
  startTimes.push(new Date().getTime());

  doHardWorkFor(10);

  return { namespace: { count: state.namespace.count + 1 } };
}

function gameLogic15ms (delta, state) {
  startTimes.push(new Date().getTime());

  doHardWorkFor(15);

  return { namespace: { count: state.namespace.count + 1 } };
}
// function gameLogic (delta, state) {
//   return {
//     namespace: {
//       count: state.for('namespace').get('count') + 1
//     }
//   };
// }

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

const timeout = 30000;

describe.skip('Physics Frames Performance', function () {
  this.timeout(timeout);

  let next;

  before(() => {
    next = sinon.stub(sequence, 'next');
    for (let i = 0; i < 5000; i++) {
      next.onCall(i).returns(i + 1);
    }
  });

  beforeEach(() => {
    var initialState = {
      ensemble: { waitingForPlayers: false },
      namespace: { count: 0 }
    };

    each(onClientStart, function (callback) {
      callback(initialState);
    });

    startTimes = [];
    blockedDuration = [];
  });

  after(() => {
    next.restore();
  });

  describe('with trivial logic', () => {
    let start;
    let stop;

    beforeEach(done => {
      onPhysicsFrame.push(['*', gameLogic]);

      start = now();
      startPhysicsEngine();

      setTimeout(() => {
        stop = now();

        done();
      }, timeout - 1000);
    });

    afterEach(() => {
      stopPhysicsEngine();
      onPhysicsFrame.pop();
    });

    it('should run at 60 fps or better', () => {
      const frames = currentState.get(count);
      const durationInSeconds = (stop - start) / 1000;

      expect(frames / durationInSeconds).toBeGreaterThanOrEqualTo(60);
    });

    it('should call the physics loop every ~15ms', () => {
      let timeSincePrior = [];
      for(let i = 0; i < startTimes.length; i += 1) {
        if (i === 0) {
          continue;
        }

        timeSincePrior.push(startTimes[i] - startTimes[i - 1]);
      }

      logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
      logDataAboutSamples('Blocked (ms)', blockedDuration);

      expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);
    });
  });

  describe('with 5ms logic', () => {
    let start;
    let stop;

    beforeEach(done => {
      onPhysicsFrame.push(['*', gameLogic5ms]);

      start = now();
      startPhysicsEngine();

      setTimeout(() => {
        stop = now();
        done();
      }, timeout - 1000);
    });

    afterEach(() => {
      stopPhysicsEngine();
      onPhysicsFrame.pop();
    });

    it('should run at 60 fps or better', () => {
      const frames = currentState.get(count);
      const durationInSeconds = (stop - start) / 1000;

      expect(frames / durationInSeconds).toBeGreaterThanOrEqualTo(60);
    });

    it('should call the physics loop every ~15ms', () => {
      let timeSincePrior = [];
      for(let i = 0; i < startTimes.length; i += 1) {
        if (i === 0) {
          continue;
        }

        timeSincePrior.push(startTimes[i] - startTimes[i - 1]);
      }

      logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
      logDataAboutSamples('Blocked (ms)', blockedDuration);

      expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);
    });
  });

  describe('with 10ms logic', () => {
    let start;
    let stop;

    beforeEach(done => {
      onPhysicsFrame.push(['*', gameLogic10ms]);

      start = now();
      startPhysicsEngine();

      setTimeout(() => {
        stop = now();
        done();
      }, timeout - 1000);
    });

    afterEach(() => {
      stopPhysicsEngine();
      onPhysicsFrame.pop();
    });

    it('should run at 60 fps or better', () => {
      const frames = currentState.get(count);
      const durationInSeconds = (stop - start) / 1000;

      expect(frames / durationInSeconds).toBeGreaterThanOrEqualTo(60);
    });

    it('should call the physics loop every ~15ms', () => {
      let timeSincePrior = [];
      for(let i = 0; i < startTimes.length; i += 1) {
        if (i === 0) {
          continue;
        }

        timeSincePrior.push(startTimes[i] - startTimes[i - 1]);
      }

      logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
      logDataAboutSamples('Blocked (ms)', blockedDuration);

      expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);
    });
  });

  describe('with 15ms logic', () => {
    let start;
    let stop;

    beforeEach(done => {
      onPhysicsFrame.push(['*', gameLogic15ms]);

      start = now();
      startPhysicsEngine();

      setTimeout(() => {
        stop = now();
        done();
      }, timeout - 1000);
    });

    afterEach(() => {
      stopPhysicsEngine();
      onPhysicsFrame.pop();
    });

    it('should run at 60 fps or better', () => {
      const frames = currentState.get(count);
      const durationInSeconds = (stop - start) / 1000;

      expect(frames / durationInSeconds).toBeGreaterThanOrEqualTo(60);
    });

    it('should call the physics loop every ~15ms', () => {
      let timeSincePrior = [];
      for(let i = 0; i < startTimes.length; i += 1) {
        if (i === 0) {
          continue;
        }

        timeSincePrior.push(startTimes[i] - startTimes[i - 1]);
      }

      logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
      logDataAboutSamples('Blocked (ms)', blockedDuration);

      expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);
    });
  });

  describe.skip('with server state coming in after every frame', () => {
    it('should perform just as well');
  });

  describe.skip('with server state coming in after 5 frames', () => {
    it('should perform just as well');
  });

  describe.skip('with server state coming in after 10 frames', () => {
    it('should perform just as well');
  });

  describe.skip('with server state coming in after 20 frames', () => {
    it('should perform just as well');
  });
});