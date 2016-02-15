'use strict';

var includes = require('lodash').includes;
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');
var saves = require('../../util/models/saves');
var interval = require('../../util/interval');

module.exports = {
  type: 'ContinualSave',
  deps: ['DefinePlugin', 'RawStateAccess', 'Time'],
  func: function ContinualSave (define, rawState, time) {


    function AfterPhysicsFrame() {
      if (!includes(['persistent', 'ephemeral'], config.get().ensemble.autoSaveBehaviour)) {
        return config.get().nothing;
      }

      logger.info('Enabled: "continual" save.');

      function saveEveryFrame (state) {
        saves.save(rawState().for(state.get('ensemble.saveId')), time().present());
      }

      return interval.execute(saveEveryFrame).every(config.get().ensemble.autoSaveThrottle).calls();
    }

    function OnSaveReady () {
      return function insertInitialCopyIntoDatabase (save) {
        saves.save(rawState().for(save.id), time().present());
      };
    }

    define()('OnSaveReady', OnSaveReady);
    define()('AfterPhysicsFrame', AfterPhysicsFrame);
  }
};