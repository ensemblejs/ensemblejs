'use strict';

const last = require('lodash/last');
const { filterPluginsByMode } = require('../../util/modes');

module.exports = {
  type: 'OnNewSave',
  deps: ['StateSeed', 'SyncMutator'],
  func: (stateSeeds, mutateNow) => {
    return function initialiseStateForSave (save) {
      const seeds = filterPluginsByMode(stateSeeds(), save.mode);

      seeds.forEach((state) => mutateNow()(save.id, last(state)));
    };
  }
};