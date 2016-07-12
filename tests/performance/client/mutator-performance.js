const Benchmark = require('benchmark');
const v8 = require('v8');

import {configure, plugin} from '../../../src/plugins/plug-n-play';
const defer = require('../../support').defer;
const logger = require('../../fake/logger');
configure(logger);
const mutate = require('../../../src/state/client/mutator').func(defer(logger));
var afterPhysicsFrame = plugin('AfterPhysicsFrame');

function newSuite (name, done) {
  return new Benchmark.Suite(name, {
    onStart: () => console.log(`\n\n${name}`),
    onCycle: event => console.log(String(event.target)),
    onComplete: function () {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
      done();
    }
  });
}

const saveId = 1;
const MochaTimeout = 30000;
const KB = 1000;
const MB = 1000 * KB;

const blockOfText = size => !size ? {} : Array(size).fill(1).map(() => Math.floor(Math.random() * 10)).join('');

function data (size) {
  return {
    topLevel: 'a',
    stuff: blockOfText(size)
  };
}

describe.skip('mutator performance tests', function () {
  this.timeout(MochaTimeout);
  let memoryBefore;
  let memoryAfter;

  beforeEach(() => {
    memoryBefore = v8.getHeapStatistics().used_heap_size;
  });

  afterEach(() => {
    memoryAfter = v8.getHeapStatistics().used_heap_size;

    const change = memoryAfter - memoryBefore;

    console.log(`${change}B, ${change / 1024}KB, ${change / 1024 / 1024}MB`);
  });

  describe('with small state', () => {
    beforeEach(() => {
      mutate(saveId, data(1));
      afterPhysicsFrame();
    });

    it('where we replace a single top level prop', done => {
      const suite = newSuite('Replace single top-level property', done);

      suite.add('Simple object', () => {
        mutate(saveId, { topLevel: Math.floor(Math.random() * 1000)});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        mutate(saveId, ['topLevel', Math.floor(Math.random() * 1000)]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        mutate(saveId, [
          ['topLevel', Math.floor(Math.random() * 1000)]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });
  });

  describe('with 1KB state', () => {
    const a = blockOfText(1 * KB);
    const b = blockOfText(1 * KB);
    let c = 0;
    let d = 0;
    let e = 0;

    beforeEach(() => {
      mutate(saveId, data(1 * KB));
      afterPhysicsFrame();
    });

    it('where we replace a single top level prop', done => {
      const suite = newSuite('Replace single top-level property', done);

      suite.add('Simple object', () => {
        mutate(saveId, { topLevel: Math.floor(Math.random() * 1000)});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        mutate(saveId, ['topLevel', Math.floor(Math.random() * 1000)]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        mutate(saveId, [
          ['topLevel', Math.floor(Math.random() * 1000)]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });

    it('where we replace a the 1KB string', done => {
      const suite = newSuite('where we replace a the 1KB string', done);

      suite.add('Simple object', () => {
        c += 1;
        mutate(saveId, { stuff: c % 2 === 0 ? a : b});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        d += 1;
        mutate(saveId, ['stuff', d % 2 === 0 ? a : b]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        e += 1;

        mutate(saveId, [
          ['stuff', e % 2 === 0 ? a : b]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });
  });

  describe('with 10KB state', () => {
    const a = blockOfText(10 * KB);
    const b = blockOfText(10 * KB);
    let c = 0;
    let d = 0;
    let e = 0;

    beforeEach(() => {
      mutate(saveId, data(10 * KB));
      afterPhysicsFrame();
    });

    it('where we replace a single top level prop', done => {
      const suite = newSuite('Replace single top-level property', done);

      suite.add('Simple object', () => {
        mutate(saveId, { topLevel: Math.floor(Math.random() * 1000)});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        mutate(saveId, ['topLevel', Math.floor(Math.random() * 1000)]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        mutate(saveId, [
          ['topLevel', Math.floor(Math.random() * 1000)]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });

    it('where we replace a the 10KB string', done => {
      const suite = newSuite('where we replace a the 10KB string', done);

      suite.add('Simple object', () => {
        c += 1;
        mutate(saveId, { stuff: c % 2 === 0 ? a : b});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        d += 1;
        mutate(saveId, ['stuff', d % 2 === 0 ? a : b]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        e += 1;

        mutate(saveId, [
          ['stuff', e % 2 === 0 ? a : b]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });
  });

  describe('with 100KB state', () => {
    const a = blockOfText(100 * KB);
    const b = blockOfText(100 * KB);
    let c = 0;
    let d = 0;
    let e = 0;

    beforeEach(() => {
      mutate(saveId, data(100 * KB));
      afterPhysicsFrame();
    });

    it('where we replace a single top level prop', done => {
      const suite = newSuite('Replace single top-level property', done);

      suite.add('Simple object', () => {
        mutate(saveId, { topLevel: Math.floor(Math.random() * 1000)});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        mutate(saveId, ['topLevel', Math.floor(Math.random() * 1000)]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        mutate(saveId, [
          ['topLevel', Math.floor(Math.random() * 1000)]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });

    it('where we replace a the 100KB string', done => {
      const suite = newSuite('where we replace a the 100KB string', done);

      suite.add('Simple object', () => {
        c += 1;
        mutate(saveId, { stuff: c % 2 === 0 ? a : b});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        d += 1;
        mutate(saveId, ['stuff', d % 2 === 0 ? a : b]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        e += 1;

        mutate(saveId, [
          ['stuff', e % 2 === 0 ? a : b]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });
  });

  describe('with 1MB state', () => {
    const a = blockOfText(1 * MB);
    const b = blockOfText(1 * MB);
    let c = 0;
    let d = 0;
    let e = 0;

    beforeEach(() => {
      mutate(saveId, data(1 * MB));
      afterPhysicsFrame();
    });

    it('where we replace a single top level prop', done => {
      const suite = newSuite('Replace single top-level property', done);

      suite.add('Simple object', () => {
        mutate(saveId, { topLevel: Math.floor(Math.random() * 1000)});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        mutate(saveId, ['topLevel', Math.floor(Math.random() * 1000)]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        mutate(saveId, [
          ['topLevel', Math.floor(Math.random() * 1000)]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });

    it('where we replace a the 1MB string', done => {
      const suite = newSuite('where we replace a the 1MB string', done);

      suite.add('Simple object', () => {
        c += 1;
        mutate(saveId, { stuff: c % 2 === 0 ? a : b});
        afterPhysicsFrame();
      });
      suite.add('dot-string', () => {
        d += 1;
        mutate(saveId, ['stuff', d % 2 === 0 ? a : b]);
        afterPhysicsFrame();
      });
      suite.add('array of array with dot-string', () => {
        e += 1;

        mutate(saveId, [
          ['stuff', e % 2 === 0 ? a : b]
        ]);
        afterPhysicsFrame();
      });

      suite.run({ async: false });
    });
  });
});

// const typeB = newSuite('Add to top-level array');
// const typeC = newSuite('Remove from top-level array');
// const typeD = newSuite('Replace deeply nested single property');
// const typeE = newSuite('Add to deeply nested array');
// const typeF = newSuite('Remove from deeply nested array');
