'use strict';

var icon = require('../../public/partials/share-icon.pug');
// var modal = require('../../public/partials/share-modal.pug');
import define from '../define';

module.exports = {
  type: 'Share',
  deps: ['$'],
  func: function Fullscreen ($) {

    function showShare () {

    }

    function reposition (dims) {
      if (dims.orientation === 'landscape') {
        $()('.share.icon').css('top', '160px').css('right', '0');
      } else {
        $()('.share.icon').css('right', '160px').css('top', '0');
      }
    }

    define('OnClientReady', function Fullscreen () {
      return function setup (dims) {
        $()('.icons').append(icon());
        reposition(dims);

        $()('.share.icon').on('click', showShare);
      };
    });

    define('ActionMap', function Fullscreen () {
      return {
        'share': [{call: showShare}],
      };
    });

    define('OnResize', function Fullscreen () {
      return reposition;
    });
  }
};