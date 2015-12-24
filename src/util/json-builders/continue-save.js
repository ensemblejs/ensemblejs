'use strict';

var config = require('../../util/config').get();

function buildJson (save) {
  return {
    mode: save.mode,
    dashboard: config.ensemble.dashboard,
    debugMode: config.debug.enabled
  };
}

module.exports = buildJson;