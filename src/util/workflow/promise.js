'use strict';

var Bluebird = require('bluebird');

function redirectTo (uri) {
  return Bluebird.reject({
    reason: 'redirect',
    data: {
      uri: uri
    }
  });
}

function kickstartPromiseChain (thing) {
  return new Bluebird(function (resolve) {
    resolve(thing);
  });
}

function returnRequestError (code, message) {
  return Bluebird.reject({
    reason: code,
    data: {
      message: message
    }
  });
}

module.exports = {
  redirectTo: redirectTo,
  kickstartPromiseChain: kickstartPromiseChain,
  returnRequestError: returnRequestError
};