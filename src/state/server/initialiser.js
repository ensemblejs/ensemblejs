'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var intersection = require('lodash').intersection;
var first = require('lodash').first;
var last = require('lodash').last;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

module.exports = {
  type: 'InitialiseState',
  deps: ['StateSeed', 'StateMutator'],
  func: function (stateSeed, stateMutator) {
    return {
      initialise: function(gameId, mode) {
        var applicableSeeds = filter(stateSeed(), function(stateSeed) {
          return isApplicable(mode, stateSeed);
        });

        each(applicableSeeds, function (state) {
          stateMutator()(gameId, last(state));
        });
      }
    };
  }
};