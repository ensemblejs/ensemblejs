'use strict';

import define from '../../';
import { hostname } from '../../util/hostname';

module.exports = {
  type: 'DevelopmentMiddleware',
  func: () => {
    define('WebServerMiddleware', () => {
      return function redirectIfLocalhost (req, res, next) {
        if (req.headers.host.startsWith('localhost')) {
          return res.redirect(`${hostname()}${req.url}`);
        }

        next();
      }
    });
  }
};