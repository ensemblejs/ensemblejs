'use strict';

import {execute} from 'royal-sampler';
import {map} from 'lodash';
import read from 'ok-selector';

let playerNumber;
let lastKnownPlayerGroup = [];
let lastKnownPlayerGroupChanged = true;

function OnClientReady (tracker, $) {
  function updatePlayerCount (count) {
    $()('#player-count .value').text(count);
  }

  function addPlayer (id, player, cell) {
    $()('#debug').append(cell({
      id: `player-${id}`,
      title: `Player ${player.get('number')}`,
      value: player.get('status'),
      devices: player.get('devices').get('length'),
      differentSubnet: player.get('onSameSubnet') ? '' : '*',
      toPlayer: id === playerNumber ? undefined : player.get('playerId')
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
    const rectSmall = require('../../../public/partials/dashboard/rect-small.pug');
    const player = require('../../../public/partials/debug/player-switcher.pug');

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
    lastKnownPlayerGroup = map(players, (player) => {
      player.id = player.number;
      return player;
    });

    lastKnownPlayerGroupChanged = true;
  };
}


function BeforePhysicsFrame () {
  function refreshPlayerList () {
    if (!lastKnownPlayerGroupChanged) {
      return undefined;
    }

    lastKnownPlayerGroupChanged = false;
    return ['ensembleDebug.players', lastKnownPlayerGroup];
  }

  return execute(refreshPlayerList).every(1).second();
}

function OnClientConnect () {
  return function incrementPlayerCount (state) {
    return [
      'ensembleDebug.playerCount', read(state, 'ensembleDebug.playerCount') + 1
    ];
  };
}

function OnClientDisconnect () {
  return function decrementPlayerCount (state) {
    return [
      'ensembleDebug.playerCount', read(state, 'ensembleDebug.playerCount') - 1
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