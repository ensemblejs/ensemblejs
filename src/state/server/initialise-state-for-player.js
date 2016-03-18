'use strict';

import {each, last, merge} from 'lodash';
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;


function OnNewPlayer (playerStateSeeds, mutate) {
  return function initialiseStateForSave (save, playerId) {
    var playerState = {id: playerId};

    each(filterPluginsByMode(playerStateSeeds(), save.mode), seed => {
      playerState = merge(playerState, last(seed)(playerId));
    });

    mutate()(save.id, ['players+', playerState]);
  };
}

module.exports = {
  type: 'StateInitialiser',
  deps: ['DefinePlugin'],
  func: function StateInitialiser (define) {
    define()('OnNewPlayer', ['PlayerStateSeed', 'StateMutator'], OnNewPlayer);
  }
};