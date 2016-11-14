'use strict';

import {byPlayer as p} from '../../util/scope';
import define from '../../define';

function toggle (current) {
  return !current;
}

module.exports = {
  type: 'Share',
  deps: ['Window', '$'],
  func: function Share (window, $) {
    function seedShareScreenState () {
      return {
        ensemble: {
          shareVisible: false
        }
      };
    }

    function show () {
      $()('#canvas').hide();
      $()('#overlay').hide();
      $()('#share').show();
    }
    function hide () {
      $()('#canvas').show();
      $()('#overlay').show();
      $()('#share').hide();
    }

    function reposition (dims) {
      if (dims.landscape()) {
        $()('.share.icon').css('top', '160px').css('right', '0');
      } else {
        $()('.share.icon').css('right', '160px').css('top', '0');
      }
    }

    define('OnClientReady', ['StateTracker', 'AnchorAction', 'DeviceMode'], (tracker, anchorAction, deviceMode) => {
      return function setup (dims, playerId) {
        if (deviceMode().supportedInput.length === 0) {
          return;
        }

        const icon = require('../../../public/partials/share-icon.pug');
        const modal = require('../../../public/views/share-modal.pug');
        const url = `${window().location.origin}${window().location.pathname}`;

        $()('.icons').append(icon({action: 'open-share'}));
        $()('body').append(modal({url}));

        hide();

        $().getScript('/ensemble/js/3rd-party/qrcode.js', () => {
          const element = window().document.getElementById('qrcode');

          return new QRCode(element, {
            text: url,
            width: dims.screenHeight / 2,
            height: dims.screenHeight / 2
          });
        });

        reposition(dims);

        anchorAction().add($()('.share.icon'));
        anchorAction().add($()('.tap-button'));

        tracker().onChangeTo(p(playerId, 'ensemble.shareVisible'), true, show);
        tracker().onChangeTo(p(playerId, 'ensemble.shareVisible'), false, hide);
      };
    });

    function toggleshare (state, input, data) {
      return [p(data.playerId, 'ensemble.shareVisible'), toggle];
    }

    define('ActionMap', () => {
      return {
        'open-share': [{call: toggleshare, onRelease: true, whenWaiting: true}],
        'close-share': [{call: toggleshare, onRelease: true, whenWaiting: true}]
      };
    });

    define('OnResize', () => reposition);
    define('PlayerStateSeed', () => seedShareScreenState);
  }
};