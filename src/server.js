'use strict';

var compression = require('compression');
var express = require('express');
var favicon = require('serve-favicon');
var logger = require('./logging/logger.js').logger;
var expressBunyanLogger = require('express-bunyan-logger');

module.exports = {
  type: 'HttpServer',
  deps: ['SocketServer'],
  func: function (configureServerSockets) {
    var extension = '.jade';
    var server;

    function configureApp (assetPath) {
      var app = express();

      app.use(expressBunyanLogger({
        logger: logger,
        excludes: [
          'req',
          'res',
          'res-headers',
          'response-hrtime',
          'short-body',
          'req-headers',
          'incoming',
          'req_id',
          'body'
        ]
      }));
      app.use(expressBunyanLogger.errorLogger({
        logger: logger
      }));
      app.use(compression());
      app.use('/game', express.static(assetPath));
      app.use('/ensemble', express.static(__dirname + '/../public/'));
      app.use(require('morgan')('combined'));
      app.use(require('body-parser').urlencoded({extended: true }));
      app.use(require('body-parser').json());
      app.set('views', ['game/views/pages', __dirname + '/../public/views']);
      app.set('view options', {layout: false});
      app.engine('jade', require('jade').__express);

      var pathToFavIcon = process.cwd() + '/game/favicon.ico';
      if (!require('fs').existsSync(pathToFavIcon)) {
        pathToFavIcon = __dirname + '/../public/favicon.ico';
      }
      app.use(favicon(pathToFavIcon));

      return app;
    }

    function configureSingleModeGame (app) {
      app.get('/', function (req, res) {
        res.render('primary' + extension, { mode: 'game' });
      });
    }

    function configureMultiModeGame (app) {
      app.get('/', function (req, res) {
        res.render('index' + extension);
      });

      app.get('/:mode/', function (req, res) {
        var mode = req.params.mode;
        res.render('primary' + extension, { mode: mode });
      });
    }

    function configureRoutes (app, modes) {
      if (modes.length > 0) {
        configureMultiModeGame(app);
      } else {
        configureSingleModeGame(app);
      }
    }

    function start (assetPath, modes) {
      modes = modes || [];

      var app = configureApp(assetPath);
      configureRoutes(app, modes);

      server = require('http').createServer(app);
      server.listen(process.env.PORT || 3000);

      configureServerSockets().start(server, modes);
    }

    function stop () {
      configureServerSockets().stop();

      if (server !== undefined) {
        server.close();
      }
    }

    return {
      start: start,
      stop: stop
    };
  }
};