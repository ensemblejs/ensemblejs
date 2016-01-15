'use strict';

var config = require('../../util/config').get();

function buildJson (saveMode, deviceMode) {
  return {
    saveMode: saveMode,
    deviceMode: deviceMode,
    dashboard: config.ensemble.dashboard,
    debugMode: config.debug.enabled
  };
}

module.exports = buildJson;