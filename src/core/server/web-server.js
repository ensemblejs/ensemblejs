'use strict';

var compression = require('compression');
var express = require('express');
var favicon = require('serve-favicon');
var expressSession = require('express-session');
var http = require('http');
var fs = require('fs');
var expressBunyanLogger = require('express-bunyan-logger');
var each = require('lodash').each;
var config = require('../../util/config').get();

module.exports = {
  type: 'OnServerStart',
  deps: ['SocketServer', 'Logger', 'DefinePlugin', 'Routes', 'RequestEventPublisher', 'UUID', 'WebServerMiddleware'],
  func: function (socket, logger, define, routes, requestEventPublisher, uuid, middleware) {
    var server;
    var session;

    var pathToPublic = __dirname + '/../../../public';

    function configureApp (assetPath, project) {
      var app = express();

      app.use(expressBunyanLogger({
        logger: logger().logger,
        excludes: config.logging.expressBunyanLogger.excludes
      }));
      app.use(expressBunyanLogger.errorLogger({
        logger: logger.logger
      }));
      app.use(compression());
      app.use('/game', express.static(assetPath));
      app.use('/ensemble', express.static(pathToPublic + '/'));
      app.use(require('morgan')('combined'));
      app.use(require('body-parser').urlencoded({extended: true }));
      app.use(require('body-parser').json());
      app.set('views', ['game/views/pages', pathToPublic + '/views']);
      app.set('view options', {layout: false});
      app.engine('jade', require('jade').__express);

      var pathToFavIcon = process.cwd() + '/game/favicon.ico';
      if (!fs.existsSync(pathToFavIcon)) {
        pathToFavIcon = pathToPublic + '/favicon.ico';
      }
      app.use(favicon(pathToFavIcon));
      app.use(requestEventPublisher().middleware);

      session = expressSession({
        genid: uuid().get,
        secret: 'ensemblejs-' + project.name,
        resave: true,
        saveUninitialized: true
      });

      app.use(session);

      each(middleware(), function (f) {
        app.use(f);
      });

      return app;
    }

    function configureErrorHandlers (app) {
      app.use(function(req, res) {
        res.sendStatus(404);
      });

      app.use(function(err, req, res, next) {
        if (!config.debug.develop) {
          res.status(500).send('Well, this is awkward.');
        } else {
          res.status(500).send(err.message);
        }

        next(err);
      });
    }

    function start (assetPath, project) {
      var app = configureApp(assetPath, project);

      each(routes(), function(route) {
        route.configure(app, project);
      });

      configureErrorHandlers(app);

      server = http.createServer(app);
      server.listen(process.env.PORT || 3000);

      socket().start(server, project.modes, session);
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