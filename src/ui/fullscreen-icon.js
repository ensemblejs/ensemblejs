'use strict';

var screenfull = require('screenfull');
var icon = require('../../public/partials/fullscreen-icon.jade');

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
        $()('.fullscreen').css('top', '0').css('right', '0');
      } else {
        $()('.fullscreen').css('right', '0').css('top', '0');
      }
    }

    define()('OnClientReady', function Fullscreen () {
      return function setup (dims) {
        $()('.icons').append(icon());
        reposition(dims);

        $()('.fullscreen').on('click', toggleFullscreen);
      };
    });

    define()('ActionMap', function Fullscreen () {
      return {
        'fullscreen': [{target: toggleFullscreen}],
      };
    });

    define()('OnResize', function Fullscreen () {
      return reposition;
    });
  }
};