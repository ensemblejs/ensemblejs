'use strict';

var favicon = require('serve-favicon');
var fs = require('fs');

var pathToPublic = __dirname + '/../../../public';

module.exports = {
  type: 'LoadFavIcon',
  deps: ['DefinePlugin'],
  func: function LoadFavIcon (define) {
    define()('WebServerMiddleware', function () {

      var pathToFavIcon = process.cwd() + '/game/favicon.ico';
      if (!fs.existsSync(pathToFavIcon)) {
        pathToFavIcon = pathToPublic + '/favicon.ico';
      }

      return favicon(pathToFavIcon);
    });
  }
};