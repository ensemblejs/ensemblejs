'use strict';

var includes = require('lodash').includes;
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');
var saves = require('../../util/models/saves');
import {execute} from 'royal-sampler';

module.exports = {
  type: 'ContinualSave',
  deps: ['DefinePlugin', 'RawStateAccess', 'Time'],
  func: function ContinualSave (define, rawState, time) {

    function AfterPhysicsFrame() {
      if (!includes(['persistent', 'ephemeral'], config.get().ensemble.autoSaveBehaviour)) {
        return config.get().nothing;
      }

      logger.info('Enabled: "continual" save.');

      function saveEveryFrame (delta, state) {
        saves.save(rawState().for(state.ensemble.saveId).toJS(), time().present());
      }

      return execute(saveEveryFrame).every(config.get().ensemble.autoSaveThrottle).calls();
    }

    function OnSaveReady () {
      return function insertInitialCopyIntoDatabase (save) {
        return saves.save(rawState().for(save.id).toJS(), time().present());
      };
    }

    define()('OnSaveReady', OnSaveReady);
    define()('AfterPhysicsFrame', AfterPhysicsFrame);
  }
};