'use strict';

var map = require('lodash').map;
var buildGameHash = require('./game');

function buildSaveLinks (saves) {
  return map(saves, function(save) {
    return {
      name: save.id,
      what: '/save/continue',
      uri: '/saves/' + save.id,
      method: 'GET'
    };
  });
}

function buildShowSavesJson (saves, player, project) {
  return {
    game: buildGameHash(project),
    player: {
      id: player.id
    },
    saves: buildSaveLinks(saves)
  };
}

module.exports = buildShowSavesJson;