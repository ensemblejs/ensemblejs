'use strict';

var includes = require('lodash').includes;
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');
var saveQueue = require('../../util/save-queue');

module.exports = {
  type: 'ContinualSave',
  deps: ['DefinePlugin', 'RawStateAccess', 'Time'],
  func: function MongoDbBridge (define, rawState, time) {

    function SaveCurrentState() {
      if (!includes(['persistent', 'ephemeral'], config.get().ensemble.autoSaveBehaviour)) {
        return config.get().nothing;
      }

      logger.info('Enabled: "continual" save.');

      return function saveEveryFrame (state) {
        saveQueue.saveOrQueue(rawState().for(state.get('ensemble.saveId')), time().present());
      };
    }

    function InsertInitialCopyOfSave () {
      return function store (save) {
        saveQueue.saveOrQueue(rawState().for(save.id), time().present());
      };
    }

    define()('OnSaveReady', InsertInitialCopyOfSave);
    define()('AfterPhysicsFrame', SaveCurrentState);
  }
};