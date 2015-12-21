'use strict';

var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var useragent = require('useragent');

module.exports = {
  type: 'WebServerMiddleware',
  deps: ['Time', 'Metrics'],
  func: function RequestEventPublisher (time, metrics) {

    function determineIp (req) {
      return req.ip || req.connection.remoteAddress ||
        (req.socket && req.socket.remoteAddress) ||
        (req.socket.socket && req.socket.socket.remoteAddress) ||
        '127.0.0.1';
    }

    return function trackRequest (req, res, next) {
      var startTime = time().present();

      var ua = useragent.lookup(req.headers['user-agent']);

      var data = {
        'request-url': req.originalUrl,
        'request-method': req.method,
        'request-http-version': req.httpVersion,
        'request-id': req.id,
        'client-ip': determineIp(req),
        'client-browser-version': ua.toAgent(),
        'client-os-version': ua.os.toString(),
        'client-device-version': ua.device.toString()
      };

      each(req.headers, function (value, header) {
        data['request-header-' + header] = value;
      });

      delete data['request-header-if-none-match'];
      delete data['request-header-upgrade-insecure-requests'];
      delete data['request-header-dnt'];

      if (!isEqual(req.body, {})) {
        data['request-body'] = req.body;
      }
      if (!isEqual(req.params, {})) {
        data['request-params'] = req.params;
      }

      function publishEvent () {
        data['response-status-code'] = res.statusCode;
        data['response-time'] = time().present() - startTime;

        metrics().track('WebRequest', data);
      }

      res.on('finish', publishEvent);
      next();
    };
  }
};
