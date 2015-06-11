'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var contains = require('lodash').contains;
var first = require('lodash').first;
var last = require('lodash').last;

module.exports = {
  type: 'InitialiseState',
  deps: ['StateSeed', 'StateMutator'],
  func: function (stateSeed, stateMutator) {
    return {
      initialise: function(gameId, mode) {
        var applicableSeeds = filter(stateSeed(), function(stateSeed) {
          return contains(['*', mode], first(stateSeed));
        });

        each(applicableSeeds, function (state) {
          stateMutator()(gameId, last(state));
        });
      }
    };
  }
};