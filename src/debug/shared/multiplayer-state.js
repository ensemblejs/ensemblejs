'use strict';

import {execute} from 'royal-sampler';
import {map} from 'lodash';

let playerNumber;
var lastKnownPlayerGroup = [];

function OnClientReady (tracker, $) {
  function updatePlayerCount (count) {
    $()('#player-count .value').text(count);
  }

  function addPlayer (id, player, cell) {
    $()('#debug').append(cell({
      id: `player-${id}`,
      title: `Player ${player.number}`,
      value: player.status,
      devices: player.devices.length,
      toPlayer: id === playerNumber ? undefined : player.playerId
    }));

    if (playerNumber && id === playerNumber) {
      $()(`#player-${id}`).addClass('widget-active');
    }
  }

  function removePlayer (id) {
    $()(`#player-${id}`).remove();
  }

  function updatePlayer (id, current, prior, cell) {
    removePlayer(id);
    addPlayer(id, current, cell);
  }

  return function setup () {
    let rectSmall = require('../../../public/partials/dashboard/rect-small.jade');
    let player = require('../../../public/partials/debug/player-switcher.jade');

    $()('#debug').append(rectSmall({
      id: 'player-count',
      title: 'Player Count',
      value: '0'
    }));

    tracker().onChangeOf('ensembleDebug.playerCount', updatePlayerCount);
    tracker().onElementAdded('ensembleDebug.players', addPlayer, player);
    tracker().onElementRemoved('ensembleDebug.players', removePlayer);
    tracker().onElementChanged('ensembleDebug.players', updatePlayer, player);
  };
}

function OnClientPlayerId ($) {
  return function setPlayerId (number) {
    playerNumber = number;
    $()(`#player-${number}`).addClass('widget-active');
  };
}

function StateSeed () {
  return {
    ensembleDebug: {
      playerCount: 0,
      players: []
    }
  };
}

function OnPlayerGroupChange () {
  return function updatePlayerList (players) {
    lastKnownPlayerGroup = map(players, player => {
      player.id = player.number;
      return player;
    });
  };
}


function BeforePhysicsFrame () {
  function refreshPlayerList () {
    return ['ensembleDebug.players', lastKnownPlayerGroup];
  }

  return execute(refreshPlayerList).every(1).second();
}

function OnClientConnect () {
  return function incrementPlayerCount (state) {
    return [
      'ensembleDebug.playerCount', state.get('ensembleDebug.playerCount') + 1
    ];
  };
}

function OnClientDisconnect () {
  return function decrementPlayerCount (state) {
    return [
      'ensembleDebug.playerCount', state.get('ensembleDebug.playerCount') - 1
    ];
  };
}

module.exports = {
  type: 'DebugMultiplayer',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugMultiplayer (config, define) {
    if (!config().debug.multiplayer) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('OnClientConnect', OnClientConnect);
    define()('OnClientDisconnect', OnClientDisconnect);
    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
    define()('OnPlayerGroupChange', OnPlayerGroupChange);
    define()('BeforePhysicsFrame', BeforePhysicsFrame);
    define()('OnClientPlayerId', ['$'], OnClientPlayerId);
  }
};