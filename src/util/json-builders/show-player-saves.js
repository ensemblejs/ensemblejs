'use strict';

var map = require('lodash').map;

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

function buildShowSavesJson (saves, player) {
  return {
    player: {
      id: player._id,
      name: player.name
    },
    saves: buildSaveLinks(saves)
  };
}

module.exports = buildShowSavesJson;