'use strict';

const TestDuration = 9000;

const aMinute = 60;
const aSecond = 1000;
const KB = 1000;
const HeapSizeSampleHz = 50;
const MochaTimeout = TestDuration * 2;
const SkipFirst = 1000;

// const dataSizes = [1 * KB, 10 * KB, 100 * KB, 1000 * KB, 'minimal-'];
// const effort = ['minimal-', '5ms', '10ms', '15ms'];
// const fxCounts = [1, 10, 100, 250, 500, 1000];
// const serverStateInterval = ['never-', 5000, 1000, 500, 250, 100, 45];

const dataSizes = [1000 * KB];
const effort = ['5ms', '10ms'];
const fxCounts = [100, 250];
const serverStateInterval = [45];

const Toggles = {
  memwatch: false,
  heapSize: false,
  gc: false
};

const now = require('present');

const Node = (typeof window === 'undefined');

let v8;
let memwatch;
if (Node) {
  v8 = require((() => 'v8')());
  memwatch = require('memwatch-next');
}

function memwatchLeakAndStats () {
  if (!Toggles.memwatch || !Node) {
    return;
  }

  memwatch.on('leak', console.log);
  memwatch.on('stats', console.log);
}

memwatchLeakAndStats();

function preallocatedResultsPool (size, postProcessing) {
  let results = Array(size);
  let index = 0 ;

  return {
    push: value => {
      if (index < size) {
        results[index] = value;
      } else {
        results.push(value);
      }

      index += 1;
    },
    get: () => postProcessing(results.filter(sample => sample !== undefined)),
    reset: () => {
      results = Array(size);
      index =0 ;
    }
  };
}

let timeBetweenGC = {};
let gcDurations = {};

if (Toggles.gc) {
  timeBetweenGC = {
    1: preallocatedResultsPool(100, samples => samples.map(Math.ceil)),
    2: preallocatedResultsPool(100, samples => samples.map(Math.ceil)),
    4: preallocatedResultsPool(100, samples => samples.map(Math.ceil))
  };

  gcDurations = {
    1: preallocatedResultsPool(100, samples => samples),
    2: preallocatedResultsPool(100, samples => samples),
    4: preallocatedResultsPool(100, samples => samples)
  };

  var gc = (require('gc-stats'))();
  let gcStart = now();
  let gcStatsDuration;

  gc.on('stats', function (stats) {
      gcStatsDuration = now() - gcStart;
      gcStart = now();

      // console.log('GC happened', stats.gctype);
      gcDurations[stats.gctype].push(stats.pauseMS);
      timeBetweenGC[stats.gctype].push(gcStatsDuration);
  });
}

let usedHeapSize;
if (Toggles.heapSize) {
  usedHeapSize = preallocatedResultsPool(500, samples => samples);
}

const expect = require('expect');
const each = require('lodash').each;
const {sortBy} = require('lodash');
const histogram = require('ascii-histogram');
const chart = require('ascii-chart');
const setFixedInterval = require('fixed-setinterval');
const logger = require('../../fake/logger');
import define from '../../../src/plugins/plug-n-play';
import {configure, plugin} from '../../../src/plugins/plug-n-play';
configure(logger);

define('Config', function Config() {
  return {
    client: {
      clientSidePrediction: true,
      physicsUpdateLoop: 15
    }
  };
});

const time = require('../../../src/core/shared/time').func();
define('Time', () => time);

const defer = require('../../support').defer;
const trackerPlugins = require('../../support').plugin();
const processPendingInputPlugins = require('../../support').plugin();
const inputQueuePlugins = require('../../support').plugin();
const frameStorePlugins = require('../../support').plugin();

let onClientStart = [];
let onOutgoingClientPacket = [];
let onIncomingServerPacket = [];
let beforePhysicsFrame = [];
let onPhysicsFrame = [];
let afterPhysicsFrame = [];
let actionMap = [];

require('../../../src/state/client/tracker').func(defer(trackerPlugins.define));
const mutator = require('../../../src/state/client/mutator').func(defer(logger));

const rawStateAccess = plugin('RawStateAccess');
const stateAccess = plugin('StateAccess');
const realApplyPlendingMerges = plugin('AfterPhysicsFrame');

// let totalMutatorTime;
// let applyPendingMergesStart;
// let applyPendingMergesDuration;
function applyPendingMerges ()  {
  // const memoryBefore = v8.getHeapStatistics().used_heap_size;
  // const newSpaceBefore = v8.getHeapSpaceStatistics().filter(space => space.space_name === 'new_space')[0].space_available_size;
  // applyPendingMergesStart = now();

  realApplyPlendingMerges();

  // applyPendingMergesDuration = now() - applyPendingMergesStart;
  // const memoryAfter = v8.getHeapStatistics().used_heap_size;
  // const newSpaceAfter = v8.getHeapSpaceStatistics().filter(space => space.space_name === 'new_space')[0].space_available_size;
  // totalMutatorTime.push(Math.ceil(applyPendingMergesDuration));

  // console.log(memoryAfter - memoryBefore);
  // console.log(newSpaceAfter - newSpaceBefore);
  // usedHeapSize.push(memoryAfter - memoryBefore);
  // if (applyPendingMergesDuration > 8) {
  //   console.log('long frame');
  // }
}
afterPhysicsFrame.push(applyPendingMerges);

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

var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(time), defer('default'), defer(applyPendingMerges));

var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onClientStart.push(frameStorePluginDeps.OnClientStart());

var startPhysicsEngine = require('../../../src/core/client/physics').func(defer(clientState), defer(serverState), defer(time), defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(mutator), defer(stateAccess), defer(mode), defer(plugin('Config')), defer(frameStore));
var stopPhysicsEngine = plugin('OnDisconnect');

// let startTimes = null;
let blockedDuration = [];
// let rawBlockedDuration = [];
// let framesProcessedThisFrame = 0;
let doHardWorkForStart;
function doHardWorkFor (duration) {
  doHardWorkForStart = now();

  if (duration) {
    while (now() < doHardWorkForStart + duration); // eslint-disable-line
  }

  // blockedDuration.push(Math.round(now() - doHardWorkForStart));
  // rawBlockedDuration.push(Math.round(now() - doHardWorkForStart));
  // rawBlockedDuration.push(now() - start);
  // framesProcessedThisFrame += 1;
}

let frameCount = 0;
// let frameStoreDurations = [];
// let framesProcessed = [];
let totalGameDevTime = [];
let gameDevTimeForFrame = 0;
const originalFrameStoreProcess = frameStore.process;
frameStore.process = function countFrames (delta, runLogicOnFrame) {
  frameCount += 1;
  gameDevTimeForFrame = 0;

  // const start = now ();

  originalFrameStoreProcess(delta, runLogicOnFrame);

  // framesProcessed.push(framesProcessedThisFrame);
  // framesProcessedThisFrame = 0;

  // frameStoreDurations.push(Math.ceil(now() - start));
  totalGameDevTime.push(Math.ceil(gameDevTimeForFrame));
};

// const response = { namespace: { count: 1 } };
function logic (duration) {
  return function whileAwayTheHours (delta, state) {
    // startTimes.push(now());

    doHardWorkFor(duration);

    return { namespace: { count: state.namespace.count + 1 } };
    // return ['namespace.count', state.namespace.count + 1];
    // return ['namespace.count', old => old + 1];
    // return response;
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
  const sortedSamples = sortBy(samples.filter(sample => sample !== undefined));

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

  const used = samples.filter(sample => sample !== undefined);

  console.log(chart(used, { width: 500, height: 20, tight: true }));
}

function data (size) {
  return {
    ensemble: { waitingForPlayers: false },
    namespace: { count: 0 },
    stuff: !size ? {} : Array(size).fill(1).map(() => Math.floor(Math.random() * 10)).join('')
  };
}

describe('Physics Frames Performance', function () {
  this.timeout(MochaTimeout); // eslint-disable-line

  let profile;
  let testHasStarted;
  let timeTestStarted;

  before(() => {
    testHasStarted = false;

    profile = setFixedInterval(() => {
      if (!testHasStarted) {
        return;
      }
      if (timeTestStarted === undefined) {
        timeTestStarted = now();
        return;
      }
      if (now() - timeTestStarted < SkipFirst) {
        return;
      }

      if (Toggles.heapSize && Node) {
        usedHeapSize.push(v8.getHeapSpaceStatistics().filter(space => space.space_name === 'new_space')[0].space_available_size);
      }
    }, HeapSizeSampleHz);
  });

  var hd;
  beforeEach(() => {
    if (Toggles.memwatch && Node) {
      hd = new memwatch.HeapDiff();
    }
  });

  afterEach(() => {
    if (Toggles.memwatch && Node) {
      console.log(JSON.stringify(hd.end()));
    }
  });

  after(() => {
    profile();
    timeTestStarted = undefined;
  });

  let permutations = [];

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

        each(onClientStart, cb => cb(permutation.data));

        frameCount = 0;

        if (Toggles.heapSize) {
          usedHeapSize.reset();
        }
        // frameStoreDurations = [];
        // framesProcessed = [];
        totalGameDevTime = [];
        // totalMutatorTime = Array(1000);
        // startTimes = Array(150000);
        if (Toggles.gc) {
          gcDurations['1'].reset();
          gcDurations['2'].reset();
          gcDurations['4'].reset();
          timeBetweenGC['1'].reset();
          timeBetweenGC['2'].reset();
          timeBetweenGC['4'].reset();
        }
        blockedDuration = [];
        // rawBlockedDuration = [];

        permutation.code.forEach(code => (onPhysicsFrame.push(['*', code])));

        start = now();
        testHasStarted = true;
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

        // let frameworkDuration = [];
        // for (let i = 0; i < frameStoreDurations.length; i += 1) {
        //   frameworkDuration.push(frameStoreDurations[i] - totalGameDevTime[i]);
        // }

        // barChart('Duration of FrameStore.process', frameStoreDurations);
        // barChart('Duration of GameDev Logic', totalGameDevTime);
        // logDataAboutSamples('Duration of Framework Code', frameworkDuration);
        // logDataAboutSamples('Duration of Mutator Code', totalMutatorTime);
        // barChart('Mutator Duration', totalMutatorTime);
        // barChart('f(x) processed per frame', framesProcessed);

        if (Toggles.gc) {
          logDataAboutSamples('GC Pauses (minor)', gcDurations['1'].get());
          logDataAboutSamples('GC Pauses (major)', gcDurations['2'].get());
          logDataAboutSamples('Time between (minor) GC pauses', timeBetweenGC['1'].get());
          logDataAboutSamples('Time between (major) GC pauses', timeBetweenGC['2'].get());
        }

        if (Toggles.heapSize) {
          barChart('Heap Size', usedHeapSize.get());
        }

        expect(fps).toBeGreaterThanOrEqualTo(60);
      });

      it.skip('should call the physics loop every ~15ms', () => {
        // let timeSincePrior = [];
        // for(let i = 0; i < startTimes.length; i += 1) {
        //   if (i === 0) {
        //     continue;
        //   }

        //   timeSincePrior.push(startTimes[i] - startTimes[i - 1]);
        // }

        // logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
        // logDataAboutSamples('Blocked (ms)', blockedDuration);

        // expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);

        // console.log(`Total blocked duration ${sum(rawBlockedDuration)} for an average of ${average(rawBlockedDuration)}`);
      });
    });
  });

  describe('And the results', () => {
    it('are in', () => {
      results.forEach(result => {
        const percent = Math.round(result.fps / 60 * 100);
        const padding = Array(3 - String(percent).split('').length).fill(' ').join('');

        console.log(`[${padding}${percent}%] ${result.name}`);
      });
    });
  });
});