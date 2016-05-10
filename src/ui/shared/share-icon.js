'use strict';

import {byPlayer as p} from '../../util/scope';
import define from '../../define';

module.exports = {
  type: 'Share',
  deps: ['$', 'Window'],
  func: function Share ($, window) {

    function show () {
      $()('#share').show();
    }

    function hide () {
      $()('#share').hide();
    }

    function reposition (dims) {
      if (dims.orientation === 'landscape') {
        $()('.share.icon').css('top', '160px').css('right', '0');
      } else {
        $()('.share.icon').css('right', '160px').css('top', '0');
      }
    }

    define('OnClientReady', ['StateTracker'], function Share (tracker) {
      return function setup (dims, playerId) {
        var icon = require('../../../public/partials/share-icon.pug');
        var modal = require('../../../public/views/share-modal.pug');

        // $()('.icons').append(icon({action: 'open-share'}));

        reposition(dims);

        // var url = `${window().location.origin}${window().location.pathname}`;

        // $()('#overlay').append(modal({url: url}));

        tracker().onChangeTo(p(playerId, 'ensemble.shareVisible'), true, show);
        tracker().onChangeTo(p(playerId, 'ensemble.shareVisible'), false, hide);
      };
    });

    function toggleshare (state, input, data) {
      const current = state.get(p(data.playerId, 'ensemble.shareVisible'));
      return [p(data.playerId, 'ensemble.shareVisible'), !current];
    }

    define('ActionMap', function Share () {
      return {
        'open-share': [
          {call: toggleshare, onRelease: true, whenWaiting: true}
        ],
        'close-share': [
          {call: toggleshare, onRelease: true, whenWaiting: true}
        ]
      };
    });

    define('OnResize', function Share () {
      return reposition;
    });

    define('PlayerStateSeed', function Share () {
      return function seedShareScreenState () {
        return {
          ensemble: {
            shareVisible: false
          }
        };
      };
    });
  }
};