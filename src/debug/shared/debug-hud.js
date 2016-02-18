'use strict';

function StateSeed (config) {
  return {
    ensembleDebug: {
      hudVisible: config().debug.startOpen
    }
  };
}

function OnClientStart ($, tracker) {
  function hide () {
    $()('#debug').hide();
    $()('#overlay').show();
  }

  function show () {
    $()('#debug').show();
    $()('#overlay').hide();
  }

  return function addDebugOverlayToBody () {
    var overlay = require('../../../public/partials/debug/overlay.jade');

    $()('body').append(overlay());

    tracker().onChangeTo('ensembleDebug.hudVisible', true, show);
    tracker().onChangeTo('ensembleDebug.hudVisible', false, hide);
  };
}

function OnClientReady ($, anchorAction) {
  function reposition (dims) {
    if (dims.landscape()) {
      $()('.debug-icon').css('top', '128px').css('right', '0');
    } else {
      $()('.debug-icon').css('right', '128px').css('top', '0');
    }
  }

  return function setup (dims) {
    var icon = require('../../../public/partials/debug/debug-icon.jade');
    $()('.icons').append(icon());

    $()('#debug').append(icon());
    $()('#debug #debug-spanner').addClass('inverted');
    $()('#debug #debug-cog').addClass('inverted');

    reposition(dims);

    anchorAction().add($()('.debug-icon'));
  };
}

function toggleHud (state) {
  return ['ensembleDebug.hudVisible', !state.get('ensembleDebug.hudVisible')];
}

function ActionMap () {
  return {
    '`': [{call: toggleHud, onRelease: true, whenWaiting: true}],
    'toggle-hud': [{call: toggleHud, onRelease: true, whenWaiting: true}],
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

    define()('OnClientStart', ['$', 'StateTracker'], OnClientStart);
    define()('OnClientReady', ['$', 'AnchorAction'], OnClientReady);
    define()('StateSeed', ['Config'], StateSeed);
    define()('ActionMap', ActionMap);
  }
};