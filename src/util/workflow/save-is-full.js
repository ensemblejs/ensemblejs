'use strict';

var kickstartPromiseChain = require('./promise').kickstartPromiseChain;
var errorIfSaveDoesNotExist = require('./save-common').errorIfSaveDoesNotExist;
var jsonBuilder = require('../json-builders/save-is-full');

function saveIsFull (savesList) {
  return function buildJson (req) {
    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(errorIfSaveDoesNotExist)
      .then(jsonBuilder);
  };
}

module.exports = saveIsFull;