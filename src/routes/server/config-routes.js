'use strict';

var cors = require('cors');

var corsOptions = {
  origin: true,
  methods: ['GET'],
  credentials: true
};

function getConfig (req, res) {
  res.json(require('../../util/config').get());
}

module.exports = {
  type: 'Routes',
  func: function ConfigRoutes () {

    function configure (app) {
      app.get('/config', cors(corsOptions), getConfig);
    }

    return {
      configure: configure
    };
  }
};