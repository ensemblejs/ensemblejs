'use strict';

module.exports = {
  type: 'OnClientReady',
  deps: ['On', '$'],
  func: function ToggleMute (on, $) {

    return function toggleMuteUnmute () {
      $()('.sound-off').hide();

      $()('.sound-on').on('click', function () {
        $()('.sound-on').hide();
        $()('.sound-off').show();

        on().mute();
      });

      $()('.sound-off').on('click', function () {
        $()('.sound-off').hide();
        $()('.sound-on').show();

        on().unmute();
      });

    };
  }
};