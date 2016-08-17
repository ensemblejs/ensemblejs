'use strict';

const saves = require('../../util/models/saves');
import theGreatMutator from '../../util/the-great-mutator';

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function StateMutator (define) {
    const root = {};

    define()('RawStateAccess', function RawStateAccess () {
      return {
        all: () => root,
        // flush: saveId => changes[saveId].splice(0),
        for: saveId => root[saveId].all(),
        snapshot: saveId => {
          // changes[saveId].splice(0);
          return root[saveId];
        }
      };
    });

    const applyPendingMerges = () => {
      Object.keys(root).forEach(saveId => {
        root[saveId].applyPendingMerges();
      });
    };

    define()('AfterPhysicsFrame', () => applyPendingMerges);
    define()('ApplyPendingMerges', () => applyPendingMerges);

    const onLoadDefaults = {
      ensemble: {
        waitingForPlayers: true,
        paused: true
      }
    };

    define()('OnLoadSave', ['On'], function (on) {
      return function loadSaveFromDb (save) {
        function keepInMemory (state) {
          root[save.id] = theGreatMutator(
            Object.assign({}, state, onLoadDefaults)
          );

          on().saveReady(save);
        }

        return saves.getById(save.id).then(keepInMemory);
      };
    });

    define()('StateAccess', () => ({
      for: saveId => ({
        all: () => root[saveId],
        get: key => root[saveId].get(key),
        for: namespace => ({
          get: key => root[saveId].get(`${namespace}.${key}`)
        }),
        player: playerId => ({
          for: namespace => ({
            get: key => root[saveId].get(`players:${playerId}.${namespace}.${key}`)
          }),
          get: key => root[saveId].get(`players:${playerId}.${key}`)
        })
      })
    }));

    function mutate (saveId, result) {
      root[saveId] = root[saveId] || theGreatMutator();

      return root[saveId].mutate(result);
    }

    define()('SyncMutator', () => {
      return function (saveId, result) {
        mutate(saveId, result);
        root[saveId].applyPendingMerges();
      };
    });

    return mutate;
  }
};