'use strict';

import {each, last} from 'lodash';
const { clone } = require('../../util/fast-clone');
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

function OnNewSave (stateSeeds, mutate) {
  return function initialiseStateForSave (save) {
    each(filterPluginsByMode(stateSeeds(), save.mode), state => {
      mutate()(save.id, last(clone(state)));
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