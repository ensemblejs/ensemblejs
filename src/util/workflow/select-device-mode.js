'use strict';

var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var buildSelectDeviceModeJson = require('../json-builders/select-device-mode');

import {hostname} from '../../util/hostname';

function selectDeviceMode (project, savesList) {
  return function buildJson (req) {
    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(save => [save, req.player, hostname()])
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread((save, player, hostname) => [save, player, hostname, project])
      .spread(buildSelectDeviceModeJson);
  };
}

module.exports = selectDeviceMode;