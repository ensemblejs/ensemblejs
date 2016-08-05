'use strict';

import {each, last} from 'lodash';
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

function OnNewSave (stateSeeds, mutateNow) {
  return function initialiseStateForSave (save) {
    each(filterPluginsByMode(stateSeeds(), save.mode), state => {
      mutateNow()(save.id, last(state));
    });
  };
}

module.exports = {
  type: 'StateInitialiser',
  deps: ['DefinePlugin'],
  func: function StateInitialiser (define) {
    define()('OnNewSave', ['StateSeed', 'SyncMutator'], OnNewSave);
  }
};