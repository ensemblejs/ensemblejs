'use strict';

module.exports = {
  type: 'OnNewGame',
  deps: ['MeaningfulRandom'],
  func: function OnNewGame (random) {
    return function setupRandomSeed (game) {
      var seed = game.id;
      random().setup(seed);

      return {
        ensemble: {
          randomSeed: seed
        }
      };
    };
  }
};