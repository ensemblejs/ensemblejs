'use strict';

module.exports = {
  deps: ['On', 'StateTrackerHelpers', 'StateTracker', 'GameMode', '$'],
  type: 'View',
  func: function View (on, trackerHelpers, tracker, mode, $) {
    var equals = trackerHelpers().equals;

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

    function paused (state) { return state.ensemble.paused; }

    return function togglePausedOverlay () {
      tracker().onChangeTo(paused, equals(true), pause);
      tracker().onChangeTo(paused, equals(false), resume);
    };
  }
};