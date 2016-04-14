'use strict';

import {byPlayer as p} from '../../util/scope';

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

function OnClientReady ($, anchorAction, tracker) {
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
    let icon = require('../../../public/partials/debug/debug-icon.pug');
    $()('.icons').append(icon({action: 'open-hud'}));

    $()('#debug').append(icon({action: 'close-hud'}));
    $()('#debug #debug-spanner').addClass('inverted');
    $()('#debug #debug-cog').addClass('inverted');

    reposition(dims);

    anchorAction().add($()('.debug-icon'));

    tracker().onChangeTo(p(playerId, 'ensembleDebug.hudVisible'), true, show);
    tracker().onChangeTo(p(playerId, 'ensembleDebug.hudVisible'), false, hide);
  };
}

function toggleHud (state, input, data) {
  const current = state.player(data.playerId).get('ensembleDebug.hudVisible');
  return [p(data.playerId, 'ensembleDebug.hudVisible'), !current];
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
    define()('OnClientReady', ['$', 'AnchorAction', 'StateTracker'], OnClientReady);
    define()('PlayerStateSeed', ['Config'], PlayerStateSeed);
    define()('ActionMap', ActionMap);
  }
};