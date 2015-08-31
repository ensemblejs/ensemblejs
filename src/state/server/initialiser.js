'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var last = require('lodash').last;
var isApplicable = require('../../util/modes').isApplicable;

module.exports = {
  type: 'OnNewGame',
  deps: ['StateSeed', 'StateMutator'],
  func: function OnNewGame (stateSeed, mutate) {

    return function initialiseState (game) {
      var applicableSeeds = filter(stateSeed(), function(seed) {
        return isApplicable(game.mode, seed);
      });

      each(applicableSeeds, function (state) {
        mutate()(game.id, last(state));
      });
    };

  }
};