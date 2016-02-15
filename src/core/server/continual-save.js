'use strict';

var includes = require('lodash').includes;
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');
var saves = require('../../util/models/saves');

module.exports = {
  type: 'ContinualSave',
  deps: ['DefinePlugin', 'RawStateAccess', 'Time'],
  func: function ContinualSave (define, rawState, time) {


    function AfterPhysicsFrame() {
      if (!includes(['persistent', 'ephemeral'], config.get().ensemble.autoSaveBehaviour)) {
        return config.get().nothing;
      }

      logger.info('Enabled: "continual" save.');

      let i = 0;
      return function saveEveryFrame (state) {
        i += 1;

        if (i === config.get().ensemble.autoSaveThrottle) {
          saves.save(rawState().for(state.get('ensemble.saveId')), time().present());
          i = 0;
        }
      };
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