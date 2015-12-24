'use strict';

function buildPlayerHash (player) {
  return {
    id: player._id,
    name: player.name
  };
}

module.exports = buildPlayerHash;