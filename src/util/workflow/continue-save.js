'use strict';

const kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
const saveCommon = require('../workflow/save-common');
const buildContinueSaveJson = require('../json-builders/continue-save');
const urlBuilder = require('../url-builder');
const redirectTo = require('../workflow/promise').redirectTo;
const logger = require('../../logging/server/logger').logger;

import {hostname} from '../../util/hostname';
import {map} from 'lodash';

function continueSave (project, savesList, on) {
  function loadSaveIfNotLoaded (save) {
    if (!save.loaded) {
      on.loadSave(save);
    }

    return save;
  }

  const supportedDeviceModes = map(project.deviceModes, 'name');

  return function buildJson (req) {
    const deviceMode = req.query.deviceMode;

    function redirectIfDeviceModeIsUnsupported (save, player, hostname) {
      if (!deviceMode || !supportedDeviceModes.includes(deviceMode)) {
        logger.info({deviceMode}, 'Unsupported device mode.');
        return redirectTo(urlBuilder(hostname).saves(save.id).selectDeviceMode()  , 'Unsupported device mode.');
      }

      return [save, player, hostname];
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then((save) => [save, req.player, hostname()])
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread(redirectIfDeviceModeIsUnsupported)
      .spread(loadSaveIfNotLoaded)
      .then((save) => [save.mode, deviceMode])
      .spread(buildContinueSaveJson);
  };
}

module.exports = continueSave;