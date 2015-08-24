'use strict';

module.exports = {
  type: 'View',
  deps: ['Config', 'StateTracker', 'StateTrackerHelpers'],
  func: function View (config, tracker, trackerHelpers) {
    if (!config().debug.input) {
      return config().nothing;
    }

    var $ = require('zepto-browserify').$;
    var equals = trackerHelpers().equals;

    function primary (state) {
      return state.ensembleDebug.mouseButtons.primary;
    }

    function secondary (state) {
      return state.ensembleDebug.mouseButtons.secondary;
    }

    function tertiary (state) {
      return state.ensembleDebug.mouseButtons.tertiary;
    }

    function showPrimaryButton () { $('#primary').addClass('pressed'); }
    function hidePrimaryButton () { $('#primary').removeClass('pressed'); }
    function showSecondaryButton () { $('#secondary').addClass('pressed'); }
    function hideSecondaryButton () { $('#secondary').removeClass('pressed'); }
    function showTertiaryButton () { $('#tertiary').addClass('pressed'); }
    function hideTertiaryButton () { $('#tertiary').removeClass('pressed'); }

    var mouseIcon = require('../../../public/partials/mouse-buttons.jade');

    return function setupMouseIconDebugView () {
      $('#debug').append(mouseIcon());

      tracker().onChangeTo(primary, equals(true), showPrimaryButton);
      tracker().onChangeTo(primary, equals(false), hidePrimaryButton);
      tracker().onChangeTo(secondary, equals(true), showSecondaryButton);
      tracker().onChangeTo(secondary, equals(false), hideSecondaryButton);
      tracker().onChangeTo(tertiary, equals(true), showTertiaryButton);
      tracker().onChangeTo(tertiary, equals(false), hideTertiaryButton);
    };
  }
};