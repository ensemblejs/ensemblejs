'use strict';

var each = require('lodash').each;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnNewSave',
  deps: ['StateSeed', 'StateMutator'],
  func: function OnNewSave (stateSeed, mutate) {
    return function initialiseStateForSave (save) {
      var applicableSeeds = filterPluginsByMode(stateSeed(), save.mode);
      each(applicableSeeds, function (state) {
        mutate()(save.id, last(state));
      });
    };
  }
};