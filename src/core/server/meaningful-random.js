'use strict';

var logger = require('../../logging/server/logger').logger;
var seedrandom = require('seedrandom');
import read from 'ok-selector';

module.exports = {
  type: 'MeaningfulRandom',
  func: function MeaningfulRandom () {
    var generators = {};

    function setup (seed) {
      logger.ensureNotNull(seed, 'Random.seed called without seed');

      generators[seed] = seedrandom(seed, {state: true});
    }

    function number(state) {
      var seed = read(state, 'ensemble.randomSeed');
      var n = generators[seed]();

      return n;
    }

    return { setup, number };
  }
};