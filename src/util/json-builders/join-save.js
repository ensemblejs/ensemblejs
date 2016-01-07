'use strict';

var urlBuilder = require('../url-builder');

function buildJson (save, player, project) {
  return {
    game: {
      name: project.name,
    },
    player: {
      name: player.name
    },
    join: {
      method: 'POST',
      what: '/save/join',
      uri: urlBuilder().saves(save.id).join(),
      name: 'Join Save'
    }
  };
}

module.exports = buildJson;