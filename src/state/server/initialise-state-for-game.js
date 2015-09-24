'use strict';

var each = require('lodash').each;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnNewGame',
  deps: ['StateSeed', 'StateMutator'],
  func: function OnNewGame (stateSeed, mutate) {
    return function initialiseStateForGame (game) {
      var applicableSeeds = filterPluginsByMode(stateSeed(), game.mode);
      each(applicableSeeds, function (state) {
        mutate()(game.id, last(state));
      });
    };
  }
};