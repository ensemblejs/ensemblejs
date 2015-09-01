'use strict';

var callEachPlugin = require('../util/modes').callEachPlugin;

module.exports = {
  type: 'OnReady',
  deps: ['OnMute', 'OnUnmute', '$'],
  func: function ToggleMute (onMute, onUnmute, $) {

    return function toggleMuteUnmute () {
      $()('.sound-off').hide();

      $()('.sound-on').on('click', function () {
        $()('.sound-on').hide();
        $()('.sound-off').show();

        callEachPlugin(onMute());
      });

      $()('.sound-off').on('click', function () {
        $()('.sound-off').hide();
        $()('.sound-on').show();

        callEachPlugin(onUnmute());
      });

    };
  }
};