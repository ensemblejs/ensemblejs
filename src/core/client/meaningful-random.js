'use strict';

module.exports = {
  type: 'MeaningfulRandom',
  func: function MeaningfulRandom () {

    function setup () {}

    function number() {
      return Infinity;
    }

    return {
      setup: setup,
      number: number
    };
  }
};