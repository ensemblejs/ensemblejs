'use strict';

module.exports = {
  type: 'OnReady',
  deps: ['On', 'StateTrackerHelpers', 'StateTracker', 'GameMode', '$'],
  func: function PauseResume (on, trackerHelpers, tracker, mode, $) {
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