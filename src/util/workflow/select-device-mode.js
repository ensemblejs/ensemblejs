'use strict';

const kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
const saveCommon = require('../workflow/save-common');
const buildSelectDeviceModeJson = require('../json-builders/select-device-mode');
const redirectTo = require('../workflow/promise').redirectTo;

import {hostname} from '../../util/hostname';

function selectDeviceMode (project, savesList) {
  return function buildJson (req) {
    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then((save) => [save, req.player, hostname()])
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread((save, player, host) => [save, player, host, project])
      .spread(buildSelectDeviceModeJson)
      .then((json) => {
        return (json.deviceModes.length <= 1) ? redirectTo(json.deviceModes[0].uri) : json;
      })
  };
}

module.exports = selectDeviceMode;