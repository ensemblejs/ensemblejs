'use strict';

import {each, last, cloneDeep} from 'lodash';
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

function OnNewPlayer (playerStateSeeds, mutate) {
  return function initialiseStateForSave (save, playerId) {
    each(filterPluginsByMode(playerStateSeeds(), save.mode), state => {
      mutate()(save.id, last(cloneDeep(state(playerId))));
    });
  };
}

module.exports = {
  type: 'StateInitialiser',
  deps: ['DefinePlugin'],
  func: function StateInitialiser (define) {
    define()('OnNewPlayer', ['PlayerStateSeed', 'StateMutator'], OnNewPlayer);
  }
};