'use strict';

var ienoopen = require('ienoopen');
var xssFilter = require('x-xss-protection');
var frameguard = require('frameguard');
var nosniff = require('dont-sniff-mimetype');
var crossdomain = require('helmet-crossdomain');
var csp = require('helmet-csp');

module.exports = {
  type: 'SecurityMiddleware',
  deps: ['DefinePlugin'],
  func: function (define) {

    define()('WebServerMiddleware', function SecurityMiddleware () {
      return ienoopen();
    });

    define()('WebServerMiddleware', function SecurityMiddleware () {
      return xssFilter();
    });

    define()('WebServerMiddleware', function SecurityMiddleware () {
      return frameguard('deny');
    });

    define()('WebServerMiddleware', function SecurityMiddleware () {
      return nosniff();
    });

    if (process.env.NODE_ENV === 'production') {
      define()('WebServerMiddleware', function SecurityMiddleware () {
        return crossdomain({caseSensitive: true});
      });
    }

    //jshint quotmark:false
    var productionAllowedSources = [
      "'self'",
      'ws://' + process.env.HOSTNAME,
      'ws://peerjs.com:9000'
    ];
    var nonProductionAllowedSources = [
      "'self'",
      'ws://localhost:3000',
      'http://localhost:4000'
    ];

    define()('WebServerMiddleware', function SecurityMiddleware () {
      // var reportOnly = process.env.NODE_ENV !== 'production';
      var reportOnly = true;
      var connectSrc = process.env.NODE_ENV === 'production' ? productionAllowedSources : nonProductionAllowedSources;

      return csp({
        directives: {
          defaultSrc: ["'self'"],
          sandbox: ['allow-forms', 'allow-scripts'],
          reportUri: 'http://localhost:4000/event/csp',
          objectSrc: [],
          connectSrc: connectSrc
        },
        reportOnly: reportOnly,
        setAllHeaders: true,
        disableAndroid: false
      });
    });
  }
};