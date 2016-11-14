'use strict';

import read from 'ok-selector';
import bel from 'bel';

function PlayerStateSeed (config) {
  return function seedHudState () {
    return {
      ensembleDebug: {
        hudVisible: config().debug.startOpen
      }
    };
  };
}

function OnClientStart ($) {
  return function addDebugOverlayToBody () {
    const overlay = require('../../../public/partials/debug/overlay.pug');
    $()('body').append(overlay());
  };
}

function OnClientReady ($, anchorAction, tracker, deviceMode) {
  function hide () {
    $()('#debug').hide();
    $()('#overlay').show();
  }

  function show () {
    $()('#debug').show();
    $()('#overlay').hide();
  }

  function reposition (dims) {
    if (dims.landscape()) {
      $()('.debug-icon').css('top', '128px').css('right', '0');
    } else {
      $()('.debug-icon').css('right', '128px').css('top', '0');
    }
  }

  return function setup (dims, playerId) {
    if (deviceMode().supportedInput.length === 0) {
      $()('#debug').hide();
      return;
    }

    let icon = require('../../../public/partials/debug/debug-icon.pug');
    $()('.icons').append(icon({action: 'open-hud'}));
    $()('#debug').append(icon({action: 'close-hud'}));;
    $()('#debug #debug-spanner').addClass('inverted');
    $()('#debug #debug-cog').addClass('inverted');

    reposition(dims);

    anchorAction().add($()('.debug-icon'));

    tracker().onChangeTo(`players:${playerId}.ensembleDebug.hudVisible`, true, show);
    tracker().onChangeTo(`players:${playerId}.ensembleDebug.hudVisible`, false, hide);
  };
}

const toggle = (current) => !current;

function toggleHud (state, input, data) {
  return [`players:${data.playerId}.ensembleDebug.hudVisible`, toggle];
}

function ActionMap () {
  return {
    '`': [{call: toggleHud, onRelease: true, whenWaiting: true}],
    'open-hud': [{call: toggleHud, onRelease: true, whenWaiting: true}],
    'close-hud': [{call: toggleHud, onRelease: true, whenWaiting: true}]
  };
}

module.exports = {
  type: 'DebugHUD',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugHUD (config, define) {
    if (!config().debug.develop) {
      return;
    }

    define()('OnClientStart', ['$'], OnClientStart);
    define()('OnClientReady', ['$', 'AnchorAction', 'StateTracker', 'DeviceMode'], OnClientReady);
    define()('PlayerStateSeed', ['Config'], PlayerStateSeed);
    define()('ActionMap', ActionMap);
  }
};