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

    define()('WebServerMiddleware', function SecurityMiddleware () {
      //jshint quotmark:false
      var reportOnly = process.env.NODE_ENV !== 'production';
      var connectSrc = process.env.NODE_ENV === 'production' ? ["'self'"] : ["'self'", 'ws://localhost:3000'];

      return csp({
        directives: {
          defaultSrc: ["'self'"],
          sandbox: ['allow-forms', 'allow-scripts'],
          reportUri: 'https://hooks.slack.com/services/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',
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