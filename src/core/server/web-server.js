'use strict';

var compression = require('compression');
var express = require('express');
var favicon = require('serve-favicon');
var http = require('http');
var fs = require('fs');
var expressBunyanLogger = require('express-bunyan-logger');

module.exports = {
  type: 'OnStart',
  deps: ['SocketServer', 'Config', 'Logger', 'DefinePlugin', 'Routes'],
  func: function (socket, config, logger, define, routes) {
    var server;

    var pathToPublic = __dirname + '/../../../public';

    function configureApp (assetPath) {
      var app = express();

      app.use(expressBunyanLogger({
        logger: logger().logger,
        excludes: config().logging.expressBunyanLogger.excludes
      }));
      app.use(expressBunyanLogger.errorLogger({
        logger: logger().logger
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

      return app;
    }

    function start (assetPath, modes) {
      modes = modes || [];

      var app = configureApp(assetPath);
      routes().configure(app, modes);

      server = http.createServer(app);
      server.listen(process.env.PORT || 3000);

      socket().start(server, modes);
    }

    define()('OnStop', function () {
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