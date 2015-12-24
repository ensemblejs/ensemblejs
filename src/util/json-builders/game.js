'use strict';

function buildGameHash (game) {
  return {
    id: game.id,
    name: game.name,
  };
}

module.exports = buildGameHash;