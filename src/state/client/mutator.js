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

const unwrap = (node) => node.toJS === undefined ? node : node.toJS();

module.exports = {
  type: 'StateMutator',
  func: function ClientStateMutator () {
    let root = theGreatMutator({});

    define('StateAccess', () => ({
      for: () => ({
        all: root.all,
        get: key => root.get(key),
        unwrap: key => unwrap(root.get(key)),
        for: namespace => ({
          get: key => root.get(`${namespace}.${key}`),
          unwrap: key => unwrap(root.get(`${namespace}.${key}`))
        }),
        player: playerId => ({
          for: namespace => ({
            get: key => root.get(genKey(playerId, namespace, key)),
            unwrap: key => unwrap(root.get(genKey(playerId, namespace, key)))
          }),
          get: key => root.get(genKey(playerId, key)),
          unwrap: key => unwrap(root.get(genKey(playerId, key)))
        })
      })
    }));
    define('AfterPhysicsFrame', () => root.applyPendingMerges);
    define('ApplyPendingMerges', () => root.applyPendingMerges);
    define('RawStateAccess', () => ({
      get: root.all,
      resetTo: root.set
    }));

    return (saveId, result) => root.mutate(result);
  }
};