'use strict';

var Bluebird = require('bluebird');

function redirectTo (uri, explainationToUser) {
  return Bluebird.reject({
    reason: 'redirect',
    data: {
      uri: uri,
      explainationToUser: explainationToUser
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