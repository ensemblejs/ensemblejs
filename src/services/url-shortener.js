'use strict';

var Bluebird = require('bluebird');
var logger = require('../logging/server/logger').logger;

var bitly;
if (process.env.BITLY_KEY) {
  var Bitly = require('bitly');
  bitly = new Bitly(process.env.BITLY_KEY);
}

function logError (error) {
  logger.error('Unable to shorten URL', error);
}

function handleBitlyResponse (response) {
  if (response.status !== 200) {
    logError(response);
    return undefined;
  }

  return response;
}

function shorten (url) {
  function wrapBitlyRequestInPromise (resolve, reject) {
    if (bitly) {
      bitly.shorten(url).then(resolve, reject);
    } else {
      resolve(undefined);
    }
  }

  return new Bluebird(wrapBitlyRequestInPromise)
    .then(handleBitlyResponse)
    .catch(logError);
}

module.exports = {
  shorten: shorten
};