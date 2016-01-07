'use strict';

var config = require('../../util/config').get();

function buildJson () {
  return {
    game: {
      name: config.game.name
    }
  };
}

module.exports = buildJson;