'use strict';

const TestDuration = 9000;

const aMinute = 60;
const aSecond = 1000;
const KB = 1000;
const HeapSizeSampleHz = 50;
const MochaTimeout = TestDuration * 2;
const SkipFirst = 1000;

// const dataSizes = [1 * KB, 10 * KB, 100 * KB, 1000 * KB, 'minimal-'];
// const effort = ['11ms', '12ms', '13ms', '14ms', '15ms'];
// const fxCounts = [1, 10, 100, 250, 500, 1000];

const dataSizes = ['minimal-'];
const effort = ['11ms', '12ms', '13ms'];
const fxCounts = [250];

const Toggles = {
  memwatch: false,
  heapSize: false,
  gc: false,
  measureMutation: false,
  measureGameDevTime: false,
  measurePhysicsLoop: false,
  measureTimeSinceLastFrame: false
};

const now = require('present');

let v8 = require('v8');
let memwatch = require('memwatch-next');
function memwatchLeakAndStats () {
  if (!Toggles.memwatch) {
    return;
  }

  memwatch.on('leak', console.log);
  memwatch.on('stats', console.log);
}

memwatchLeakAndStats();

const sum = set => set.reduce((t, n) => t + n, 0);
const average = set => sum(set) / set.length;

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
    at: i => results[i],
    get: () => postProcessing(results.filter(sample => sample !== undefined)),
    sum: () => sum(results.filter(sample => sample !== undefined)),
    average: () => average(results.filter(sample => sample !== undefined)),
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

      gcDurations[stats.gctype].push(stats.pauseMS);
      timeBetweenGC[stats.gctype].push(gcStatsDuration);
  });
}

let usedHeapSize;
if (Toggles.heapSize) {
  usedHeapSize = preallocatedResultsPool(500, samples => samples);
}

const expect = require('expect');
const {sortBy} = require('lodash');
const histogram = require('ascii-histogram');
const chart = require('ascii-chart');
const setFixedInterval = require('fixed-setinterval');
const logger = require('../../fake/logger');
import define from '../../../src/plugins/plug-n-play';
import {configure} from '../../../src/plugins/plug-n-play';
configure(logger);

define('Config', function Config() {
  return {
    server: {
      physicsUpdateLoop: 16
    }
  };
});

const time = require('../../../src/core/shared/time').func();
define('Time', () => time);

const defer = require('../../support').defer;
const trackerPlugins = require('../../support').plugin();
const processPendingInputPlugins = require('../../support').plugin();
const mutatorPlugins = require('../../support').plugin();
const physicsPlugins = require('../../support').plugin();

let beforePhysicsFrame = [];
let onPhysicsFrame = [];
let afterPhysicsFrame = [];
let actionMap = [];


const realMutator = require('../../../src/state/server/mutator').func(defer(mutatorPlugins.define));
const mutatorPluginsDeps = mutatorPlugins.deps();
const rawStateAccess = mutatorPluginsDeps.RawStateAccess();
const stateAccess = mutatorPluginsDeps.StateAccess();
const applyPendingMerges = mutatorPluginsDeps.ApplyPendingMerges();
afterPhysicsFrame.push(mutatorPluginsDeps.AfterPhysicsFrame());

let totalGameDevTime;
let gameDevTimeForFrame;

let timeSpendMutating;
let mutator;
if (Toggles.measureMutation) {
  timeSpendMutating = preallocatedResultsPool(250, samples => samples.map(Math.ceil));

  mutator = (saveId, result) => {
    const start = now();
    const res = realMutator(saveId, result);
    timeSpendMutating.push(now() - start);

    return res;
  };
} else {
  mutator = realMutator;
}

if (Toggles.measureGameDevTime) {
  afterPhysicsFrame.push(() => {
    totalGameDevTime.push(gameDevTimeForFrame);
    gameDevTimeForFrame = 0;
  });
}


require('../../../src/state/server/tracker').func(defer(trackerPlugins.define), defer(rawStateAccess));


require('../../../src/input/server/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame();

var trackerPluginsDeps = trackerPlugins.deps();
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

const savesList = {
  loaded: () => ([{id: 1, mode: 'default'}])
};

var startPhysicsEngine = require('../../../src/core/server/physics').func(defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(stateAccess), defer(mutator), defer(savesList), defer(physicsPlugins.define), defer(time));

var stopPhysicsEngine = physicsPlugins.deps().OnServerStop();

let doHardWorkForStart;
function doHardWorkFor (duration) {
  doHardWorkForStart = now();

  if (duration) {
    while (now() < doHardWorkForStart + duration); // eslint-disable-line
  }
}

let frameCount = 0;
beforePhysicsFrame.push(() => {
  frameCount += 1;
  return undefined;
});

if (Toggles.measureGameDevTime) {
  totalGameDevTime = preallocatedResultsPool(250, samples => samples.map(Math.ceil));
  gameDevTimeForFrame = 0;
}

let startTimes;
if (Toggles.measureTimeSinceLastFrame) {
  startTimes = preallocatedResultsPool(10000, samples => samples);
}

function logic (duration) {
  return function whileAwayTheHours (delta, state) {
    const start = now();

    if (Toggles.measureTimeSinceLastFrame) {
      startTimes.push(now());
    }

    doHardWorkFor(duration);

    const ret = { namespace: { count: state.namespace.count + 1 } };

    if (Toggles.measureGameDevTime) {
      gameDevTimeForFrame += (now() - start);
    }

    return ret;
  };
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
    ensemble: { waitingForPlayers: false, paused: false },
    namespace: { count: 0 },
    stuff: !size ? {} : Array(size).fill(1).map(() => Math.floor(Math.random() * 10)).join('')
  };
}

describe.only('Server Physics Frames Performance', function () {
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

      if (Toggles.heapSize) {
        usedHeapSize.push(v8.getHeapSpaceStatistics().filter(space => space.space_name === 'new_space')[0].space_available_size);
      }
    }, HeapSizeSampleHz);
  });

  var hd;
  beforeEach(() => {
    if (Toggles.memwatch) {
      hd = new memwatch.HeapDiff();
    }
  });

  afterEach(() => {
    if (Toggles.memwatch) {
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

  fxCounts.forEach(fx => {
    effort.forEach(totalMs => {
      dataSizes.forEach(b => {
        let fEffort = totalDuration[totalMs];
        if (totalDuration[totalMs] > 0) {
          fEffort /= fx;
        }

        const name = `${fx} f(x), ${totalMs}, ${b}b`;

        permutations.push({
          name: name,
          code: Array(fx).fill(logic(fEffort)),
          data: data(b === 'minimal-' ? 0 : b),
          fxCount: fx
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

        mutator(1, permutation.data);
        applyPendingMerges();

        frameCount = 0;

        if (Toggles.heapSize) {
          usedHeapSize.reset();
        }

        if (Toggles.gc) {
          gcDurations['1'].reset();
          gcDurations['2'].reset();
          gcDurations['4'].reset();
          timeBetweenGC['1'].reset();
          timeBetweenGC['2'].reset();
          timeBetweenGC['4'].reset();
        }

        if (Toggles.measureMutation) {
          timeSpendMutating.reset();
        }

        if (Toggles.measureGameDevTime) {
          totalGameDevTime.reset();
        }

        if (Toggles.measureTimeSinceLastFrame) {
          startTimes.reset();
        }

        permutation.code.forEach(code => (onPhysicsFrame.push(['*', code])));

        start = now();
        testHasStarted = true;
        startPhysicsEngine();

        setTimeout(() => {
          stop = now();

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

        if (Toggles.gc) {
          logDataAboutSamples('GC Pauses (minor)', gcDurations['1'].get());
          logDataAboutSamples('GC Pauses (major)', gcDurations['2'].get());
          logDataAboutSamples('Time between (minor) GC pauses', timeBetweenGC['1'].get());
          logDataAboutSamples('Time between (major) GC pauses', timeBetweenGC['2'].get());
        }

        if (Toggles.heapSize) {
          barChart('Heap Size', usedHeapSize.get());
        }

        if (Toggles.measureMutation) {
          logDataAboutSamples('Time Spent Mutating', timeSpendMutating.get());
        }

        if (Toggles.measureGameDevTime) {
          logDataAboutSamples('Time Spent in GameDev', totalGameDevTime.get());
          console.log(`Total Time: ${totalGameDevTime.sum()}`);
          console.log(`Average Time: ${totalGameDevTime.average()}`);
        }

        expect(fps).toBeGreaterThanOrEqualTo(60);
      });

      if (Toggles.measureTimeSinceLastFrame) {
        it.skip('should call the physics loop every ~15ms', () => {
          let timeSincePrior = [];
          for(let i = 0; i < startTimes.get().length; i += 1) {
            if (i === 0) {
              continue;
            }

            timeSincePrior.push(startTimes.at(i) - startTimes.at(i - 1));
          }

          logDataAboutSamples('Time Since Last (ms)', timeSincePrior);
          // logDataAboutSamples('Blocked (ms)', blockedDuration);

          expect(average(timeSincePrior)).toBeLessThanOrEqualTo(16);

          // console.log(`Total blocked duration ${sum(rawBlockedDuration)} for an average of ${average(rawBlockedDuration)}`);
        });
      }
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