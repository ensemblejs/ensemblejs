'use strict';

var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var buildContinueSaveJson = require('../json-builders/continue-save');
var urlBuilder = require('../url-builder');
var redirectTo = require('../workflow/promise').redirectTo;
var logger = require('../../logging/server/logger').logger;
import {supportedDeviceModes} from '../device-mode';

import {hostname} from '../../util/hostname';
import {includes} from 'lodash';

function continueSave (savesList, on) {
  function loadSaveIfNotLoaded (save) {
    if (!save.loaded) {
      on.loadSave(save);
    }

    return save;
  }

  return function buildJson (req) {
    const deviceMode = req.query.deviceMode;

    function redirectIfDeviceModeIsUnsupported (save, player, hostname) {
      if (!deviceMode || !includes(supportedDeviceModes, deviceMode)) {
        logger.info({deviceMode}, 'Unsupported device mode.');
        return redirectTo(urlBuilder(hostname).saves(save.id).selectDeviceMode()  , 'Unsupported device mode.');
      }

      return [save, player, hostname];
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(save => [save, req.player, hostname()])
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread(redirectIfDeviceModeIsUnsupported)
      .spread(loadSaveIfNotLoaded)
      .then(save => [save.mode, deviceMode])
      .spread(buildContinueSaveJson);
  };
}

module.exports = continueSave;