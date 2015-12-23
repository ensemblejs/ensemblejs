'use strict';

var keys = require('lodash').keys;
var isNumber = require('lodash').isNumber;
var Bluebird = require('bluebird');

function renderPage (page, opts) {
  return function pageHandler (req, res) {
    res.render(page, opts);
  };
}

function buildJsonHandler (json) {
  return function jsonHandler (req, res) {
    res.json(json);
  };
}

function getSupportContentType (req, acceptTypeResponseHandlers) {
  return req.accepts(keys(acceptTypeResponseHandlers));
}

function buildRequestHandler (callbacks) {
  return function handleRequest (req, res) {
    callbacks(req.player, function (acceptTypeResponseHandlers) {
      var contentType = getSupportContentType(req, acceptTypeResponseHandlers);
      if (contentType) {
        return acceptTypeResponseHandlers[contentType](req, res);
      } else {
        var msg = 'The following Accept types supported: ' + keys(acceptTypeResponseHandlers).join(', ');

        return res.status(406).send(msg);
      }
    });
  };
}

function redirectTo (uri) {
  return Bluebird.reject({
    reason: 'redirect',
    data: {
      uri: uri
    }
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

function redirect (error) {
  return error.reason === 'redirect';
}

function isRequestError (error) {
  return isNumber(error.reason) && error.reason >= 400 && error.reason <= 499;
}

function startPromiseChangeFromSync (result) {
  return new Bluebird(function (resolve) {
    resolve(result);
  });
}

var keys = require('lodash').keys;
function getSupportedContentType (req, acceptsHash) {
  return req.accepts(keys(acceptsHash));
}

function getAcceptTypeHandler (req, acceptsHash) {
  var acceptType = getSupportedContentType(req, acceptsHash);
  if (acceptType) {
    return acceptsHash[acceptType];
  } else {
    return returnRequestError(406, 'The following Accept types supported: ' + keys(acceptsHash).join());
  }
}

function buildRequestHandler2 (jsonBuilder, acceptHashBuilder) {
  return function handleRequest (req, res) {
    jsonBuilder(req)
    .then(acceptHashBuilder)
    .then(function (acceptsHash) {
      return getAcceptTypeHandler(req, acceptsHash);
    })
    .then(function (handler) {
      handler(req, res);
    })
    .catch(redirect, function applyRedirect (err) {
      res.redirect(err.data.uri);
    })
    .catch(isRequestError, function respondWith4xx (err) {
      res.status(err.reason).send(err.data.message);
    });
  };
}

module.exports = {
  returnRequestError: returnRequestError,
  redirectTo: redirectTo,
  redirect: redirect,
  isRequestError: isRequestError,
  startPromiseChangeFromSync: startPromiseChangeFromSync,
  getAcceptTypeHandler: getAcceptTypeHandler,
  renderPage: renderPage,
  renderJson: buildJsonHandler,
  buildJsonHandler: buildJsonHandler,
  buildRequestHandler: buildRequestHandler,
  buildRequestHandler2: buildRequestHandler2
};