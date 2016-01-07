'use strict';

var savePlayers = require('../models/players-in-save');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var buildShowSavesJson = require('../json-builders/show-player-saves');

function showPlayerSaves (project) {
  return function buildJson (req) {

    function passThroughPlayerAndProject (saves) {
      return [saves, req.player, project];
    }

    return kickstartPromiseChain([project.id, req.params.playerId])
      .spread(savePlayers.getByGameAndPlayer)
      .then(passThroughPlayerAndProject)
      .spread(buildShowSavesJson);
  };
}

module.exports = showPlayerSaves;