const last = require('lodash/last');
const { filterPluginsByMode } = require('../../util/modes');

module.exports = {
  type: 'OnNewPlayer',
  deps: ['PlayerStateSeed', 'SyncMutator'],
  func: (playerStateSeeds, mutateNow) => {
    return function initialiseStateForPlayer (save, playerId) {
      const seeds = filterPluginsByMode(playerStateSeeds(), save.mode);

      mutateNow()(save.id, [
        'players+',
        seeds.reduce(
          (state, seed) => ({ ...state, ...last(seed)(playerId) }),
          {id: playerId}
        )
      ]);
    };
  }
};
