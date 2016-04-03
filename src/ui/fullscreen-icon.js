'use strict';

var screenfull = require('screenfull');
var icon = require('../../public/partials/fullscreen-icon.pug');

module.exports = {
  type: 'Fullscreen',
  deps: ['DefinePlugin', '$'],
  func: function Fullscreen (define, $) {

    function toggleFullscreen () {
      if (screenfull.enabled) {
        screenfull.toggle();
      }
    }

    function reposition (dims) {
      if (dims.orientation === 'landscape') {
        $()('.fullscreen.icon').css('top', '0').css('right', '0');
      } else {
        $()('.fullscreen.icon').css('right', '0').css('top', '0');
      }
    }

    define()('OnClientReady', function Fullscreen () {
      return function setup (dims) {
        $()('.icons').append(icon());
        reposition(dims);

        $()('.fullscreen.icon').on('click', toggleFullscreen);
      };
    });

    define()('ActionMap', function Fullscreen () {
      return {
        'fullscreen': [{call: toggleFullscreen}],
      };
    });

    define()('OnResize', function Fullscreen () {
      return reposition;
    });
  }
};