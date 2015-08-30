'use strict';

module.exports = {
  type: 'OnNewGame',
  deps: ['MeaningfulRandom'],
  func: function OnNewGame (random) {
    return function setupRandomSeed (gameId) {
      var seed = gameId;
      random().setup(seed);

      return {
        ensemble: {
          randomSeed: seed
        }
      };
    };
  }
};