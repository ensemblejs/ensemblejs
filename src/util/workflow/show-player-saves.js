'use strict';

var savePlayers = require('../models/save-players');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var buildShowSavesJson = require('../json-builders/show-player-saves');

function showPlayerSaves (project) {
  return function buildJson (req) {

    function passThroughPlayer (saves) {
      return [saves, req.player];
    }

    return kickstartPromiseChain([project.id, req.params.playerId])
      .spread(savePlayers.getSavesForGameAndPlayer)
      .then(passThroughPlayer)
      .spread(buildShowSavesJson);
  };
}

module.exports = showPlayerSaves;