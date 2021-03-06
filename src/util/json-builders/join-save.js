'use strict';

var urlBuilder = require('../url-builder');

function buildJson (save, player, hostname, project) {
  return {
    game: {
      name: project.name
    },
    save: {
      requiresSecret: false
    },
    join: {
      method: 'POST',
      what: '/save/join',
      uri: urlBuilder(hostname).saves(save.id).join(),
      name: 'Join'
    }
  };
}

module.exports = buildJson;