'use strict';

var config = require('../../util/config').get();

function buildJson () {
  return {
    title: config.game.title
  };
}

module.exports = buildJson;