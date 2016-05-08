'use strict';

var urlBuilder = require('../url-builder');

function buildJson (save, player, hostname, project) {
  return {
    game: {
      name: project.name,
    },
    links: {
      displayOnly: {
        uri: urlBuilder(hostname).saves(save.id).continue({deviceMode: 'primary'}),
        name: 'Display with Keyboard + Mouse'
      },
      displayAndController: {
        uri: urlBuilder(hostname).saves(save.id).continue({deviceMode: 'mobile'}),
        name: 'Display & Controller'
      },
      controllerOnly: {
        uri: urlBuilder(hostname).saves(save.id).continue({deviceMode: 'gamepad'}),
        name: 'Controller Only'
      }
    }
  };
}

module.exports = buildJson;