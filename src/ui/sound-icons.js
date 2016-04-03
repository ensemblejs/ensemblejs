'use strict';

var icon = require('../../public/partials/sound-icons.pug');

module.exports = {
  type: 'SoundIcon',
  deps: ['On', 'DefinePlugin', '$'],
  func: function SoundIcon (on, define, $) {

    function reposition (dims) {
      if (dims.orientation === 'landscape') {
        $()('.sound-on').css('top', '32px').css('right', '0');
        $()('.sound-off').css('top', '32px').css('right', '0');
      } else {
        $()('.sound-on').css('right', '32px').css('top', '0');
        $()('.sound-off').css('right', '32px').css('top', '0');
      }
    }

    define()('OnClientReady', function SoundIcon () {
      return function setup (dims) {
        $()('.icons').append(icon());
        reposition(dims);

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

    define()('OnResize', function SoundIcon () {
      return reposition;
    });
  }
};