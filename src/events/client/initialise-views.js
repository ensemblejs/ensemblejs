'use strict';

var callForMode = require('../../util/modes').callForMode;

module.exports = {
  type: 'OnSetupComplete',
  deps: ['View', 'Dimensions', 'GameMode'],
  func: function OnSetup (views, dimensions, mode) {
    return function initialiseViews () {
      var dims = dimensions().get();

      callForMode(views(), mode(), [dims]);
    };
  }
};