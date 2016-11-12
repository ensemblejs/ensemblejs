'use strict';

var compression = require('compression');
var express = require('express');
var http = require('http');
var each = require('lodash').each;
var config = require('../../util/config').get();
var logger = require('../../logging/server/logger').logger;
var expressSession = require('express-session');
var flash = require('connect-flash');

module.exports = {
  type: 'OnServerStart',
  deps: ['SocketServer', 'DefinePlugin', 'Routes', 'UUID', 'WebServerMiddleware'],
  func: function (socket, define, routes, uuid, middleware) {
    var server;
    var session;

    var pathToPublic = __dirname + '/../../../public';

    function configureSession () {
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.ENSEMBLE_SESSION_SECRET) {
          logger.error('No session secret. Set ENSEMBLE_SESSION_SECRET');
        }
      }
      var sessionSecret = process.env.ENSEMBLE_SESSION_SECRET || 'ensemblejs';

      session = expressSession({
        genid: uuid().gen,
        secret: sessionSecret,
        resave: true,
        saveUninitialized: true
      });

      return session;
    }

    function configureErrorHandlers (app) {
      app.use(function(req, res) {
        res.sendStatus(404);
      });

      app.use(function(err, req, res, next) {
        logger.error(err);

        if (!config.debug.develop) {
          res.status(500).send('Well, this is awkward.');
        } else {
          res.status(500).send(err.message);
        }

        next(err);
      });
    }

    function configureApp (assetPath, project) {
      var app = express();

      app.use(compression());
      app.use('/game', express.static(assetPath));
      app.use('/ensemble', express.static(pathToPublic + '/'));
      app.use(require('morgan')('combined'));
      app.use(require('body-parser').urlencoded({extended: true }));
      app.use(require('body-parser').json());
      app.use(require('cookie-parser')());
      app.set('views', ['game/views/pages', pathToPublic + '/views']);
      app.set('view options', {layout: false});
      app.engine('pug', require('pug').__express);
      app.disable('x-powered-by');

      app.use(configureSession());

      app.use(flash());

      each(middleware(), function (f) {
        app.use(f);
      });

      each(routes(), function(route) {
        route.configure(app, project);
      });

      configureErrorHandlers(app);

      return app;
    }

    function start (assetPath, project) {
      var app = configureApp(assetPath, project);

      server = http.createServer(app);
      server.listen(process.env.PORT || 3000);

      socket().start(server, project.modes, project.deviceModes, session);
    }

    define()('OnServerStop', function () {
      return function stop () {
        socket().stop();

        if (server !== undefined) {
          server.close();
        }
      };
    });

    return start;
  }
};