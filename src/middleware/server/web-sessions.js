'use strict';

var expressSession = require('express-session');
var logger = require('../../logging/server/logger').logger;

module.exports = {
  type: 'WebSessions',
  deps: ['DefinePlugin'],
  func: function WebSessions (define) {
    var session;

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ENSEMBLE_SESSION_SECRET) {
        logger.error('No session secret. Set ENSEMBLE_SESSION_SECRET');
      }
    }

    define()('WebServerMiddleware', ['UUID'], function (uuid) {
      var sessionSecret = process.env.ENSEMBLE_SESSION_SECRET || 'ensemblejs';

      session = expressSession({
        genid: uuid().get,
        secret: sessionSecret,
        resave: true,
        saveUninitialized: true
      });

      return session;
    });

    return session;
  }
};