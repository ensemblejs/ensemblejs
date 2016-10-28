'use strict';

const TestDuration = 9000;

const aMinute = 60;
const aSecond = 1000;
const KB = 1000;
const HeapSizeSampleHz = 50;
const MochaTimeout = TestDuration * 2;
const SkipFirst = 1000;

// const dataSizes = ['minimal-', 1 * KB, 10 * KB, 100 * KB, 1000 * KB];
// const effort = ['minimal-', '5ms', '10ms', '15ms'];
// const fxCounts = [1, 10, 100, 250, 500, 1000];
// const serverStateInterval = ['never-', 5000, 1000, 500, 250, 100, 45];

const dataSizes = [0 * KB];
const effort = ['8ms'];
const fxCounts = [250];
const serverStateInterval = [45];

const Toggles = {
  memwatch: false,
  heapSize: false,
  gc: false,
  frameStoreDepth: false,
  blockedDuration: false,
  gameDevTime: false,
  frameStoreDuration: false,
  mutatorTime: false,
  fps: false,
  breakdown: true
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

const resolutions = {
  'ps':     (sample) => Math.ceil(sample * 1000000000),
  '10ps':   (sample) => Math.ceil(sample * 100000000),
  '100ps':  (sample) => Math.ceil(sample * 10000000),
  'ns':     (sample) => Math.ceil(sample * 1000000),
  '10ns':   (sample) => Math.ceil(sample * 100000),
  '100ns':  (sample) => Math.ceil(sample * 10000),
  'us':     (sample) => Math.ceil(sample * 1000),
  '10us':   (sample) => Math.ceil(sample * 100),
  '100us':  (sample) => Math.ceil(sample * 10),
  'ms':     (sample) => Math.ceil(sample)
}

const removeUndefined = (sample) => sample !== undefined;

function preallocatedResultsPool (size, resolution = 'ms', postProcessing = (s) => s) {
  let results = Array(size);
  let index = 0 ;
  const resolutionTransform = resolutions[resolution];

  return {
    resolution,
    push: (value) => {
      if (index < size) {
        results[index] = value;
      } else {
        results.push(value);
      }

      index += 1;
    },
    get: () => postProcessing(results.filter(removeUndefined).map(resolutionTransform)),
    raw: () => results,
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
    1: preallocatedResultsPool(100, 'ms'),
    2: preallocatedResultsPool(100, 'ms'),
    4: preallocatedResultsPool(100, 'ms')
  };

  gcDurations = {
    1: preallocatedResultsPool(100, '100us'),
    2: preallocatedResultsPool(100, '100us'),
    4: preallocatedResultsPool(100, '100us')
  };

  const gc = (require('gc-stats'))();
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
  usedHeapSize = preallocatedResultsPool(500);
}

let frameRate;
if (Toggles.fps) {
  frameRate = preallocatedResultsPool(500);
}

const trackerDefinedDeps = require('../../support').capture();
const mutatorDefinedDeps = require('../../support').capture();
const requirePlugin = require('../../support').requirePlugin;
const expect = require('expect');
const each = require('lodash').each;
const {sortBy} = require('lodash');
import read from 'ok-selector';
const histogram = require('ascii-histogram');
const chart = require('ascii-chart');
const setFixedInterval = require('fixed-setinterval');
const logger = require('../../fake/logger');
import define from '../../../src/plugins/plug-n-play';
import {configure, plugin} from '../../../src/plugins/plug-n-play';
configure(logger);
import { tabular, reset, wrap, configure as configureBreakdown } from '../../../src/util/breakdown-profiler';
import AsciiTable from 'ascii-data-table'

configureBreakdown({
  profile: Toggles.breakdown,
  hz: 10,
  minimumPercentageOfAll: 15
});

define('Config', function Config() {
  return {
    client: {
      clientSidePrediction: true,
      physicsUpdateLoop: 15,
      physicsMaxFrameDelta: Infinity
    }
  };
});

const time = require('../../../src/core/shared/time').func();
define('Time', () => time);

const defer = require('../../support').defer;
const processPendingInputPlugins = require('../../support').plugin();
const inputQueuePlugins = require('../../support').plugin();
const frameStorePlugins = require('../../support').plugin();

const onSeedInitialState = [];
const onOutgoingClientPacket = [];
const onIncomingServerPacket = [];
const beforePhysicsFrame = [];
const onPhysicsFrame = [];
const afterPhysicsFrame = [];
const actionMap = [];

requirePlugin('state/client/tracker', {}, {
  '../src/': trackerDefinedDeps.define
});
const realMutator = requirePlugin('state/client/mutator', {
  Logger: logger
}, {
  '../src/define': mutatorDefinedDeps.define
});

const rawStateAccess = mutatorDefinedDeps.deps().RawStateAccess();
const stateAccess = mutatorDefinedDeps.deps().StateAccess();
const realApplyPlendingMerges = mutatorDefinedDeps.deps().ApplyPendingMerges();

let applyPendingMergesTime;
let requestMutationTime;
let mutator;
if (Toggles.mutatorTime) {
  applyPendingMergesTime = preallocatedResultsPool(1000, 'us');
  requestMutationTime = preallocatedResultsPool(1000, '10us');

  mutator = (saveId, result) => {
    const start = now();

    realMutator(saveId, result);

    requestMutationTime.push(now() - start);
  }
} else {
  mutator = realMutator;
}
let applyPendingMergesStart;
let applyPendingMergesDuration;
function applyPendingMerges ()  {
  // const memoryBefore = v8.getHeapStatistics().used_heap_size;
  // const newSpaceBefore = v8.getHeapSpaceStatistics().filter(space => space.space_name === 'new_space')[0].space_available_size;
  if (Toggles.mutatorTime) {
    applyPendingMergesStart = now();
  }

  realApplyPlendingMerges();

  // const memoryAfter = v8.getHeapStatistics().used_heap_size;
  // const newSpaceAfter = v8.getHeapSpaceStatistics().filter(space => space.space_name === 'new_space')[0].space_available_size;

  if (Toggles.mutatorTime) {
    applyPendingMergesDuration = now() - applyPendingMergesStart;
    applyPendingMergesTime.push(applyPendingMergesDuration);
  }

  // console.log(memoryAfter - memoryBefore);
  // console.log(newSpaceAfter - newSpaceBefore);
  // usedHeapSize.push(memoryAfter - memoryBefore);
  // if (applyPendingMergesDuration > 8) {
  //   console.log('long frame');
  // }
}
afterPhysicsFrame.push(applyPendingMerges);

const mode = 'default';
const inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(time), defer(plugin('Config')));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
const processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

onSeedInitialState.push(trackerDefinedDeps.deps().OnSeedInitialState(defer(rawStateAccess)));
// onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerDefinedDeps.deps().AfterPhysicsFrame(defer(rawStateAccess)));

const clientState = { get: () => false };

const frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(time), defer('default'), defer(applyPendingMerges), defer({ id: () => 1 }), defer({ number: () => 1 }));

const frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onSeedInitialState.push(frameStorePluginDeps.OnSeedInitialState());

const collisionDetectionBridge = {
  detectCollisions: () => undefined
};

let framesExecutePerInterval = 0;
let framesProcessed = [];

const startPhysicsEngine = requirePlugin('core/client/physics', {
  CurrentState: clientState,
  BeforePhysicsFrame: beforePhysicsFrame,
  OnPhysicsFrame: onPhysicsFrame,
  AfterPhysicsFrame: afterPhysicsFrame,
  StateMutator: mutator,
  StateAccess: stateAccess,
  SaveMode: mode,
  Config: plugin('Config'),
  FrameStore: frameStore,
  CollisionDetectionBridge: collisionDetectionBridge
}, {
  'fixed-setinterval': (onInterval, Δ) => {
    if (Toggles.frameStoreDepth) {
      return setFixedInterval((...params) => {
        framesProcessed.push(framesExecutePerInterval);
        framesExecutePerInterval = 0;

        onInterval(...params);
      }, Δ);
    }

    return setFixedInterval(onInterval, Δ);
  }
});

const stopPhysicsEngine = plugin('OnDisconnect');

// let startTimes = null;
let blockedDuration
if (Toggles.blockedDuration) {
  blockedDuration = preallocatedResultsPool(200000, 'us');
}
// let rawBlockedDuration = [];
let doHardWorkForStart;
function doHardWorkFor (duration) {
  doHardWorkForStart = now();

  if (duration) {
    while (now() < doHardWorkForStart + duration); // eslint-disable-line
  }

  if (Toggles.blockedDuration) {
    blockedDuration.push(now() - doHardWorkForStart);
  }
  // rawBlockedDuration.push(Math.round(now() - doHardWorkForStart));
  // rawBlockedDuration.push(now() - start);
}

let lastFrameCount = 0;
let timeSinceStart;
let frameCount = 0;
let frameStoreDurations;
if (Toggles.frameStoreDuration) {
  frameStoreDurations = preallocatedResultsPool(1000, 'ms');
}
let totalGameDevTime;
if (Toggles.gameDevTime) {
  totalGameDevTime = preallocatedResultsPool(1000, 'ms');
}
let gameDevTimeForFrame = 0;
const originalFrameStoreProcess = frameStore.process;
frameStore.process = function countFrames (delta, runLogicOnFrame) {
  const start = now();

  frameCount += 1;

  if (Toggles.gameDevTime) {
    gameDevTimeForFrame = 0;
  }

  // console.log(frameCount);

  originalFrameStoreProcess(delta, runLogicOnFrame);

  if (Toggles.frameStoreDepth) {
    framesExecutePerInterval += 1;
  }

  if (Toggles.gameDevTime) {
    gameDevTimeForFrame = now() - start;
    totalGameDevTime.push(gameDevTimeForFrame);
  }

  if (Toggles.frameStoreDuration) {
    frameStoreDurations.push(now() - start);
  }

  if (Toggles.fps) {
    timeSinceStart = timeSinceStart || start;
    if ((start - timeSinceStart - aSecond) > 0) {
      timeSinceStart += aSecond;

      frameRate.push(frameCount - lastFrameCount)
      lastFrameCount = frameCount;
    }
  }
};

// const response = { namespace: { count: 1 } };
function logic (duration) {
  const whileAwayTheHours = (delta, state) => {
    // startTimes.push(now());

    // console.time('doHardWorkFor');
    doHardWorkFor(duration);
    // console.timeEnd('doHardWorkFor');

    // return { namespace: { count: read(state, 'namespace.count') + 1 } };
    // return ['namespace.count', read(state, 'namespace.count') + 1];
    // return ['namespace.count', (old) => old + 1];
    return ['namespace.count', 1];
    // return undefined;
  };

  return wrap(whileAwayTheHours);
}










// function sum (set) {
//   return set.reduce((t, n) => t + n, 0);
// }

// function average (set) {
//   return sum(set) / set.length;
// }

function getPercentile (percentile, values) {
  if (values.length === 0) {
    return 0;
  }

  const i = (percentile/100) * values.length;

  if (Math.floor(i) === i) {
    return (values[i-1] + values[i])/2;
  }

  return values[Math.floor(i)];
}

function logDataAboutSamples (name, samples, resolution = 'ms') {
  const sortedSamples = sortBy(samples.filter(removeUndefined));

  console.log(name);

  console.log(`50th ${getPercentile(50, sortedSamples)} (${resolution})`);
  console.log(`75th ${getPercentile(75, sortedSamples)} (${resolution})`);
  console.log(`95th ${getPercentile(95, sortedSamples)} (${resolution})`);
  console.log(`99th ${getPercentile(99, sortedSamples)} (${resolution})`);

  const asHistogram = [];
  samples.forEach((sample) => {
    asHistogram[Math.round(sample)] = asHistogram[Math.round(sample)] || 0;
    asHistogram[Math.round(sample)] += 1;
  });

  console.log(histogram(asHistogram));
}

const width = 300;
function barChart (name, samples, opts) {
  console.log(name);

  const used = samples.filter(removeUndefined);

  for (let i = 0; i < used.length; i += width) {
    console.log(chart(used.slice(i, i + width), { width, height: 20, tight: true, ...opts }));
  }
}

function data () {
  return {
    ensemble: { waitingForPlayers: false },
    namespace: { count: 0 },
    stuff: []
  };
}

function changes (size) {
  return [
    ['stuff', !size ? {} : Array(size).fill(1).map(() => Math.floor(Math.random() * 10)).join('')]
  ];
}

describe.only('Client Client Side Prediction Performance', function () {
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
        usedHeapSize.push(v8.getHeapSpaceStatistics().filter((space) => space.space_name === 'new_space')[0].space_available_size);
      }
    }, HeapSizeSampleHz);
  });

  let hd;
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

  const permutations = [];

  const totalDuration = {
    'trivial-ms': 0,
    '1ms': 1,
    '2ms': 2,
    '3ms': 3,
    '4ms': 4,
    '5ms': 5,
    '6ms': 6,
    '7ms': 7,
    '8ms': 8,
    '9ms': 9,
    '10ms': 10,
    '11ms': 11,
    '12ms': 12,
    '13ms': 13,
    '14ms': 14,
    '15ms': 15
  };

  fxCounts.forEach((fx) => {
    effort.forEach((totalMs) => {
      dataSizes.forEach((b) => {
        serverStateInterval.forEach((interval) => {
          let fEffort = totalDuration[totalMs];
          if (totalDuration[totalMs] > 0) {
            fEffort /= fx;
          }

          const name = `${fx} f(x), ${totalMs}, ${b}b, ${interval}ms server refresh`;

          permutations.push({
            name,
            code: Array(fx).fill(logic(fEffort)),
            initial: data(0),
            changeDeltas: changes(b === 'minimal-' ? 0 : b),
            fxCount: fx,
            serverRate: interval
          });
        });
      });
    });
  });

  console.log(`There are ${permutations.length} permutations. Settle in as this will take ${Math.ceil((permutations.length * TestDuration) / aSecond / aMinute)} minute(s).`);

  const results = [];

  permutations.forEach((permutation) => {
    describe(`with ${permutation.name} logic`, () => {
      let startOfTest;
      let endOfTest;

      before((done) => {
        console.log(`Running ${permutation.name}`);

        each(onSeedInitialState, (cb) => cb(permutation.initial));

        frameCount = 0;

        if (Toggles.heapSize) {
          usedHeapSize.reset();
        }
        if (Toggles.frameStoreDuration) {
          frameStoreDurations.reset();
        }
        if (Toggles.fps) {
          frameRate.reset();
        }
        if (Toggles.frameStoreDepth) {
          framesProcessed = [];
        }
        if (Toggles.gameDevTime) {
          totalGameDevTime.reset();
        }
        if (Toggles.mutatorTime) {
          applyPendingMergesTime.reset();
          requestMutationTime.reset();
        }
        // startTimes = Array(150000);
        if (Toggles.gc) {
          gcDurations['1'].reset();
          gcDurations['2'].reset();
          gcDurations['4'].reset();
          timeBetweenGC['1'].reset();
          timeBetweenGC['2'].reset();
          timeBetweenGC['4'].reset();
        }
        if (Toggles.blockedDuration) {
          blockedDuration.reset();
        }
        // rawBlockedDuration = [];

        permutation.code.forEach((code) => (onPhysicsFrame.push(['*', code])));

        reset();

        startOfTest = now();
        testHasStarted = true;
        startPhysicsEngine();

        let stopPushServerState;
        if (permutation.serverRate !== 'never-') {

          stopPushServerState = setFixedInterval(() => {
            onIncomingServerPacket.forEach((cb) => cb({
              changeDeltas: permutation.changeDeltas,
              highestProcessedMessage: [{
                frameId: frameCount,
                playerId: 1,
                deviceNumber: 1
              }]
            }));
          }, permutation.serverRate);

        }

        setTimeout(() => {
          endOfTest = now();

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
        const durationInSeconds = (endOfTest - startOfTest) / aSecond;
        const fps = Math.floor(frameCount / durationInSeconds);

        results.push({name: permutation.name, fps});

        if (Toggles.frameStoreDuration) {
          logDataAboutSamples('FrameStore.process duration (ms)', frameStoreDurations.get(), frameStoreDurations.resolution);

          barChart('Duration of FrameStore.process', frameStoreDurations.get());
        }

        if (Toggles.gameDevTime) {
          barChart('Duration of GameDev Logic', totalGameDevTime.get());
          logDataAboutSamples('GameDev Logic', totalGameDevTime.get(), totalGameDevTime.resolution);
        }

        if (Toggles.gameDevTime && Toggles.frameStoreDuration) {
          const rawFrameStoreDuration = frameStoreDurations.raw()
          const rawTotalGameDevTime = totalGameDevTime.raw()

          let frameworkDuration = preallocatedResultsPool(1000, 'us');
          for (let i = 0; i < rawFrameStoreDuration.length; i += 1) {
            frameworkDuration.push(rawFrameStoreDuration[i] - rawTotalGameDevTime[i]);
          }

          logDataAboutSamples('Duration of Framework Code', frameworkDuration.get(),frameworkDuration.resolution);
        }
        if (Toggles.mutatorTime) {
          logDataAboutSamples('Apply Pending Merges', applyPendingMergesTime.get(), applyPendingMergesTime.resolution);
          barChart('Apply Pending Merges', applyPendingMergesTime.get());

          logDataAboutSamples('Request Mutation', requestMutationTime.get(), requestMutationTime.resolution);
          barChart('Request Mutation', requestMutationTime.get());
        }
        if (Toggles.frameStoreDepth) {
          barChart('f(x) processed per frame', framesProcessed, { tight: false });
          console.log(framesProcessed)
        }

        if (Toggles.gc) {
          logDataAboutSamples('GC Pauses (minor)', gcDurations['1'].get(), gcDurations['1'].resolution);
          logDataAboutSamples('GC Pauses (major)', gcDurations['2'].get(), gcDurations['2'].resolution);
          logDataAboutSamples('Time between (minor) GC pauses', timeBetweenGC['1'].get(), timeBetweenGC['1'].resolution);
          logDataAboutSamples('Time between (major) GC pauses', timeBetweenGC['2'].get(), timeBetweenGC['2'].resolution);
        }

        if (Toggles.heapSize) {
          barChart('Heap Size', usedHeapSize.get());
        }

        if (Toggles.blockedDuration) {
          logDataAboutSamples('GameDev Time (ms)', blockedDuration.get(), blockedDuration.resolution);
        }

        if (Toggles.fps) {
          barChart('Frame Rate', frameRate.get(), { tight: false });
        }

        if (Toggles.breakdown) {
          console.log(AsciiTable.run(tabular()));
        }

        expect(fps).toBeGreaterThanOrEqualTo(60);
      });
    });
  });

  describe('And the results', () => {
    it('are in', () => {
      results.forEach((result) => {
        const percent = Math.round(result.fps / 60 * 100);
        const padding = Array(3 - String(percent).split('').length).fill(' ').join('');

        console.log(`[${padding}${percent}%] ${result.name}`);
      });
    });
  });
});