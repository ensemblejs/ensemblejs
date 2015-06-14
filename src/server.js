'use strict';

var express = require('express');
var favicon = require('serve-favicon');

module.exports = {
  type: 'Server',
  deps: ['SocketSupport'],
  func: function (configureServerSockets) {
    var extension = '.jade';
    var server;

    var configureApp = function (assetPath) {
      var app = express();

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
    };

    var configureSingleModeGame = function (app) {
      app.get('/', function (req, res) {
        res.render('primary' + extension, { mode: 'game' });
      });
    };

    var configureMultiModeGame = function (app) {
      app.get('/', function (req, res) {
        res.render('index' + extension);
      });

      app.get('/:mode/', function (req, res) {
        var mode = req.params.mode;
        res.render('primary' + extension, { mode: mode });
      });
    };

    var configureRoutes = function (app, modes) {
      if (modes.length > 0) {
        configureMultiModeGame(app);
      } else {
        configureSingleModeGame(app);
      }
    };

    return {
      start: function (assetPath, modes) {
        modes = modes || [];

        var app = configureApp(assetPath);
        configureRoutes(app, modes);

        server = require('http').createServer(app);
        server.listen(process.env.PORT || 3000);

        configureServerSockets().start(server, modes);
      },
      stop: function () {
        configureServerSockets().stop();

        if (server !== undefined) {
          server.close();
        }
      }
    };
  }
};