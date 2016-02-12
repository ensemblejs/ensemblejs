'use strict';

var logger = require('../../logging/server/logger').logger;
import {exists, isLocal, create}  from '../../util/database';
import Bluebird from 'bluebird';

module.exports = {
  type: 'DatabaseIntegration',
  deps: ['DefinePlugin', 'RawStateAccess', 'On'],
  func: function DbBridge (define, rawState, on) {

    function createIfMissingAndLocal (database) {
      return function doCheck (result) {
        if (!result && isLocal()) {
          return create(database);
        } else if (!result) {
          return Bluebird.reject({database: database});
        }
      };
    }

    function CheckDatabasesExist () {
      return function doCheckForDatabases () {
        return exists('devices')
          .then(createIfMissingAndLocal('devices'))
          .then(() => exists('players'))
          .then(createIfMissingAndLocal('players'))
          .then(() => exists('games'))
          .then(createIfMissingAndLocal('games'))
          .then(() => exists('saves'))
          .then(createIfMissingAndLocal('saves'))
          .then(on().databaseReady)
          .catch(err => logger.error(err, 'Database does not exist.'));
      };
    }

    define()('OnServerStart', CheckDatabasesExist);
  }
};