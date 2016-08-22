'use strict';

import define from '../../plugins/plug-n-play';
import theGreatMutator from '../../util/the-great-mutator-immutablejs';

const cache = {};
function genKey (playerId, namespace, key) {
  if (cache[playerId] && cache[playerId][namespace] && cache[playerId][namespace][key]) {
    return cache[playerId][namespace][key];
  }

  const suffix = key === undefined ? namespace : `${namespace}.${key}`;

  cache[playerId] = cache[playerId] || {};
  cache[playerId][namespace] = cache[playerId][namespace] || {};
  cache[playerId][namespace][key] = `players:${playerId}.${suffix}`;

  return cache[playerId][namespace][key];
}

module.exports = {
  type: 'StateMutator',
  func: function ClientStateMutator () {
    let state = theGreatMutator({});

    define('StateAccess', () => ({
      for: () => ({
        all: state.all,
        get: key => state.get(key),
        for: namespace => ({
          get: key => state.get(`${namespace}.${key}`)
        }),
        player: playerId => ({
          for: namespace => ({
            get: key => state.get(genKey(playerId, namespace, key))
          }),
          get: key => state.get(genKey(playerId, key))
        })
      })
    }));
    define('AfterPhysicsFrame', () => state.applyPendingMerges);
    define('ApplyPendingMerges', () => state.applyPendingMerges);
    define('RawStateAccess', () => ({
      get: () => state.all(),
      resetTo: newState => state.set(newState)
    }));

    return (saveId, result) => state.mutate(result);
  }
};