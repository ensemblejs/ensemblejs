'use strict';

function StateSeed (config) {
  return {
    ensembleDebug: {
      hudVisible: config().debug.startOpen
    }
  };
}

function OnClientReady ($, tracker) {
  function hide () {
    $()('#debug').hide();
  }

  function show () {
    $()('#debug').show();
  }

  return function addDebugOverlayToBody () {
    var overlay = require('../../../public/partials/debug/overlay.jade');

    $()('body').append(overlay());

    tracker().onChangeTo('ensembleDebug.hudVisible', true, show);
    tracker().onChangeTo('ensembleDebug.hudVisible', false, hide);
  };
}

function toggleHud (state) {
  return {
    ensembleDebug: {
      hudVisible: !state.get('ensembleDebug.hudVisible')
    }
  };
}

function ActionMap () {
  return {
    '`': [{target: toggleHud, onRelease: true}]
  };
}

module.exports = {
  type: 'DebugHUD',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugHUD (config, define) {
    if (!config().debug.develop) {
      return;
    }

    define()('OnClientReady', ['$', 'StateTracker'], OnClientReady);
    define()('StateSeed', ['Config'], StateSeed);
    define()('ActionMap', ActionMap);
  }
};