'use strict';

var icon = require('../../public/partials/pause-icon.jade');

function paused (state) { return state.ensemble.paused; }

module.exports = {
  type: 'PauseResume',
  deps: ['On', '$', 'GameMode', 'DefinePlugin'],
  func: function PauseResume (on, $, mode, define) {

    function pause () {
      $()('.paused').show();
      $()('#paused').show();

      on().pause('client', mode());
    }

    function resume () {
      $()('.paused').hide();
      $()('#paused').hide();

      on().resume('client', mode());
    }

    function reposition (dims) {
      if (dims.orientation === 'landscape') {
        $()('.paused').css('top', '96px').css('right', '0');
      } else {
        $()('.paused').css('right', '96px').css('top', '0');
      }
    }

    define()('OnClientReady', ['StateTrackerHelpers', 'StateTracker'], function ConnectDisconnect (trackerHelpers, tracker) {

      return function setup (dims) {
        $()('.icons').append(icon());
        reposition(dims);

        var equals = trackerHelpers().equals;

        tracker().onChangeTo(paused, equals(true), pause);
        tracker().onChangeTo(paused, equals(false), resume);

        resume();
      };
    });

    define()('OnResize', function ConnectDisconnect () {
      return reposition;
    });
  }
};