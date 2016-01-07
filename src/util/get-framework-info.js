'use strict';

var appRoot = require('app-root-path');

module.exports = function getFrameworkInfo () {
  var pathToPackageJson = appRoot + '/node_modules/ensemblejs/package.json';
  if (require('fs').existsSync(pathToPackageJson)) {
    return require(pathToPackageJson);
  } else {
    return require(appRoot + '/package.json');
  }
};