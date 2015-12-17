'use strict';

function getConfig (req, res) {
  res.json(require('../../util/config').get());
}

module.exports = {
  type: 'Routes',
  func: function ConfigRoutes () {

    function configure (app) {
      app.get('/config', getConfig);
    }

    return {
      configure: configure
    };
  }
};