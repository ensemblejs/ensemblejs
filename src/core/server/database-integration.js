'use strict';

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo');
var config = require('../../util/config');
var saveQueue = require('../../util/save-queue');

module.exports = {
  type: 'DatabaseIntegration',
  deps: ['DefinePlugin', 'RawStateAccess', 'On', 'Time'],
  func: function MongoDbBridge (define, rawState, on, time) {

    function notifyObservers() {
      logger.info('Connected to MongoDB');
      on().databaseReady();
    }

    function OpenDbConnection () {
      return function connectToMongo () {
        return mongo.connect(config.get().mongo.endpoint)
          .then(notifyObservers)
          .catch(function (err) {
            logger.error(err, 'Could not connect to MongoDB');
          });
      };
    }

    function closeConnection () {
      logger.info('Closing connection to MongoDB');
      mongo.disconnect();
    }

    function CloseDbConnection () {
      return function closeConnectionToMongo () {
        return saveQueue.flushPendingSaves(time().present()).then(closeConnection);
      };
    }

    function OnDatabaseReady () {
      return function flush () {
        saveQueue.flushPendingSaves(time().present());
      };
    }

    define()('OnServerStart', OpenDbConnection);
    define()('OnServerStop', CloseDbConnection);
    define()('OnDatabaseReady', OnDatabaseReady);
  }
};