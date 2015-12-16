'use strict';

function addTrailingSlash (path) {
  return path.substr(-1) === '/' ? path : path + '/';
}

function normaliseRelativePath (path) {
  return path.substr(0, 1) === '/' ? path : require('path').join(__dirname, path);
}

module.exports = {
  addTrailingSlash: addTrailingSlash,
  normaliseRelativePath: normaliseRelativePath
};