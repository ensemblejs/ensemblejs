'use strict';

var seedrandom = require('seedrandom');

module.exports = {
  type: 'MeaningfulRandom',
  deps: ['Logger', 'DefinePlugin'],
  func: function MeaningfulRandom (logger) {
    var generators = {};

    function setup (seed) {
      logger().ensureNotNull(seed, 'Random.seed called without seed');

      generators[seed] = seedrandom(seed, {state: true});
    }

    function number(state) {
      var seed = state.for('ensemble').get('randomSeed');
      var n = generators[seed]();

      return n;
    }

    return {
      setup: setup,
      number: number
    };
  }
};