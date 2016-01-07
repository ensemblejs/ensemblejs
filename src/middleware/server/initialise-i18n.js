'use strict';

var i18n = require('i18n');
var path = require('path');
var appRoot = require('app-root-path');
var config = require('../../util/config').get();

module.exports = {
  type: 'WebServerMiddleware',
  func: function () {
    i18n.configure({
      locales: config.ensemble.locales,
      objectNotation: true,
      updateFiles: false,
      directory: path.join(appRoot.toString(), '/dist/locales')
    });

    return i18n.init;
  }
};