'use strict';

var map = require('lodash').map;
var buildGameHash = require('./game');

function buildSaveLinks (saves) {
  return map(saves, function(save) {
    return {
      name: save.saveId,
      what: '/save/continue',
      uri: '/saves/' + save.saveId,
      method: 'GET'
    };
  });
}

function buildShowSavesJson (saves, player, project) {
  return {
    game: buildGameHash(project),
    player: {
      id: player._id
    },
    saves: buildSaveLinks(saves)
  };
}

module.exports = buildShowSavesJson;