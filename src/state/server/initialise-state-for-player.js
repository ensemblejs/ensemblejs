'use strict';

import {each, last} from 'lodash';
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;


function OnNewPlayer (playerStateSeeds, mutate) {
  return function initialiseStateForSave (save, playerId) {
    mutate()(save.id, ['players+', {id: playerId}]);

    each(filterPluginsByMode(playerStateSeeds(), save.mode), seed => {
      mutate()(save.id, [`players:${playerId}`, last(seed)(playerId)]);
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