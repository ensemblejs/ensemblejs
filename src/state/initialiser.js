'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'InitialiseState',
  deps: ['StateSeed', 'StateMutator'],
  func: function (stateSeed, stateMutator) {
    return {
      initialise: function(gameId) {
        each(stateSeed(), function (state) {
          stateMutator()(gameId, state);
        });
      }
    };
  }
};