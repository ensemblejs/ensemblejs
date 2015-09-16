'use strict';

var icon = require('../../public/partials/sound-icons.jade');

module.exports = {
  type: 'SoundIcon',
  deps: ['On', 'DefinePlugin'],
  func: function SoundIcon (on, define) {

    define()('OnClientReady', ['$'], function SoundIcon ($) {
      return function setup () {
        $()('.icons').append(icon());

        $()('.sound-off').hide();

        $()('.sound-on').on('click', function showSoundOffIcon () {
          $()('.sound-on').hide();
          $()('.sound-off').show();

          on().mute();
        });

        $()('.sound-off').on('click', function showSoundOnIcon () {
          $()('.sound-off').hide();
          $()('.sound-on').show();

          on().unmute();
        });
      };
    });

    define()('OnResize', ['$'], function SoundIcon ($) {
      return function layoutIcons (dims) {
        if (dims.orientation === 'landscape') {
          $()('.sound-on').css('top', '32px').css('right', '0');
          $()('.sound-off').css('top', '32px').css('right', '0');
        } else {
          $()('.sound-on').css('right', '32px').css('top', '0');
          $()('.sound-off').css('right', '32px').css('top', '0');
        }
      };
    });
  }
};