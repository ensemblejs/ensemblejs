'use strict';

function buildPlayerHash (player) {
  return {
    id: player._id
  };
}

module.exports = buildPlayerHash;