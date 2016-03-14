'use strict';

import {each, last, cloneDeep} from 'lodash';
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

function OnNewSave (stateSeeds, mutate) {
  return function initialiseStateForSave (save) {
    each(filterPluginsByMode(stateSeeds(), save.mode), state => {
      mutate()(save.id, last(cloneDeep(state)));
    });
  };
}

module.exports = {
  type: 'StateInitialiser',
  deps: ['DefinePlugin'],
  func: function StateInitialiser (define) {
    define()('OnNewSave', ['StateSeed', 'StateMutator'], OnNewSave);
  }
};