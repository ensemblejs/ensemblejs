'use strict';

var rekuire = require('rekuire');
var each = require('lodash').each;
var filter = require('lodash').filter;
var last = require('lodash').last;
var isApplicable = rekuire('src/util/modes').isApplicable;

module.exports = {
  type: 'InitialiseState',
  deps: ['StateSeed', 'StateMutator'],
  func: function (stateSeed, mutate) {

    function initialise (game) {
      var applicableSeeds = filter(stateSeed(), function(seed) {
        return isApplicable(game.mode, seed);
      });

      each(applicableSeeds, function (state) {
        mutate()(game.id, last(state));
      });
    }

    return {
      initialise: initialise
    };
  }
};