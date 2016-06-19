'use strict';

module.exports = {
  type: 'OnNewSave',
  deps: ['MeaningfulRandom'],
  func: function OnNewSave (random) {
    return function setupRandomSeed (save) {
      var seed = save.id;

      random().setup(seed);

      return ['ensemble.randomSeed', seed];
    };
  }
};