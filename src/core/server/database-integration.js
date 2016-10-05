'use strict';

const logger = require('../../logging/server/logger').logger;
import * as database  from '../../util/database';
import {bootstrap, strapboot} from 'ensemblejs-couch-bootstrap';

import Bluebird from 'bluebird';

module.exports = {
  type: 'DatabaseIntegration',
  deps: ['DefinePlugin', 'On'],
  func: function DbBridge (define, on) {

    function errorIfMissing (db) {
      return function doCheck (result) {
        if (!result) {
          return Bluebird.reject({database: db});
        }
      };
    }

    function CheckDatabasesExist () {
      return function doCheckForDatabases () {
        return new Bluebird((resolve) => {
          if (database.isLocal()) {
            logger.info('Running locally. Tearing down and rebuilding all databases.');

            return strapboot(database)
              .then(() => bootstrap(database))
              .then(resolve);
          }

          resolve();
        }).then(() => database.exists('devices'))
          .then(errorIfMissing('devices'))
          .then(() => database.exists('players'))
          .then(errorIfMissing('players'))
          .then(() => database.exists('saves_metadata'))
          .then(errorIfMissing('saves_metadata'))
          .then(() => database.exists('saves'))
          .then(errorIfMissing('saves'))
          .then(on().databaseReady)
          .catch((err) => logger.error(err, 'Database does not exist.'));
      };
    }

    define()('OnServerStart', CheckDatabasesExist);
  }
};