'use strict';

import {each, last, cloneDeep} from 'lodash';
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnNewSave',
  deps: ['StateSeed', 'StateMutator'],
  func: function OnNewSave (stateSeed, mutate) {
    return function initialiseStateForSave (save) {
      var applicableSeeds = filterPluginsByMode(stateSeed(), save.mode);
      each(applicableSeeds, function (state) {
        mutate()(save.id, last(cloneDeep(state)));
      });
    };
  }
};