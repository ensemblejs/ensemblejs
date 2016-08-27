'use strict';

module.exports = {
  type: 'OnNewSave',
  deps: ['MeaningfulRandom'],
  func: function OnNewSave (random) {
    return function setupRandomSeed (save) {
      const seed = save.id;

      random().setup(seed);

      return {
        ensemble: {
          randomSeed: seed
        }
      };
    };
  }
};