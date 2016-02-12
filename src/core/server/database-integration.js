'use strict';

var logger = require('../../logging/server/logger').logger;
import * as database  from '../../util/database';
import {bootstrap} from 'ensemblejs-couch-bootstrap';

import Bluebird from 'bluebird';

module.exports = {
  type: 'DatabaseIntegration',
  deps: ['DefinePlugin', 'RawStateAccess', 'On'],
  func: function DbBridge (define, rawState, on) {

    function errorIfMissing (bucket) {
      return function doCheck (result) {
        if (!result) {
          return Bluebird.reject({database: bucket});
        }
      };
    }

    function CheckDatabasesExist () {
      return function doCheckForDatabases () {
        return new Bluebird(resolve => {
          if (database.isLocal()) {
            return bootstrap(database).then(resolve);
          } else {
            resolve();
          }
        }).then(() => database.exists('devices'))
          .then(errorIfMissing('devices'))
          .then(() => database.exists('players'))
          .then(errorIfMissing('players'))
          .then(() => database.exists('saves_metadata'))
          .then(errorIfMissing('saves_metadata'))
          .then(() => database.exists('saves'))
          .then(errorIfMissing('saves'))
          .then(on().databaseReady)
          .catch(err => logger.error(err, 'Database does not exist.'));
      };
    }

    define()('OnServerStart', CheckDatabasesExist);
  }
};