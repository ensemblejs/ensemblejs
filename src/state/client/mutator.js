'use strict';

import define from '../../define';
import theGreatMutator from 'the-great-mutator/immutable';
import { wrap } from '../../util/breakdown-profiler';

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

function ClientStateMutator () {
  const state = theGreatMutator({}, { trackChanges: false });

  define('StateAccess', () => ({
    for: () => ({
      all: state.all,
      get: (key) => state.get(key),
      for: (namespace) => ({
        get: (key) => state.get(`${namespace}.${key}`)
      }),
      player: (playerId) => ({
        for: (namespace) => ({
          get: (key) => state.get(genKey(playerId, namespace, key))
        }),
        get: (key) => state.get(genKey(playerId, key))
      })
    })
  }));
  define('AfterPhysicsFrame', () => state.applyPendingMerges);
  define('ApplyPendingMerges', () => state.applyPendingMerges);
  define('RawStateAccess', () => ({
    get: () => state,
    resetTo: (newState) => state.set(newState)
  }));

  const mutate = (saveId, result) => state.mutate(result);
  return wrap(mutate);
}

module.exports = { type: 'StateMutator', func: ClientStateMutator };