'use strict';

var keys = require('lodash').keys;
var isNumber = require('lodash').isNumber;
var returnRequestError = require('./workflow/promise').returnRequestError;

function renderPage (page, opts) {
  return function pageHandler (req, res) {
    res.render(page, opts);
  };
}

function renderJson (json) {
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

function redirect (error) {
  return error.reason === 'redirect';
}

function isRequestError (error) {
  return isNumber(error.reason) && error.reason >= 400 && error.reason <= 499;
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

function buildAcceptHash (page) {
  return function acceptHash (json) {
    return {
      'html': renderPage(page, json),
      'json': renderJson(json)
    };
  };
}

function buildGetRequestHandler (jsonBuilder, page) {
  return function handleRequest (req, res) {
    jsonBuilder(req)
    .then(buildAcceptHash(page))
    .then(acceptsHash => getAcceptTypeHandler(req, acceptsHash))
    .then(handler => handler(req, res))
    .catch(redirect, function applyRedirect (err) {
      if (err.data.explainationToUser) {
        req.flash('info', err.data.explainationToUser);
      }
      res.redirect(err.data.uri);
    })
    .catch(isRequestError, function respondWith4xx (err) {
      res.status(err.reason).send(err.data.message);
    });
  };
}

function buildPostRequestHandler (jsonBuilder) {
  return function handleRequest (req, res) {
    jsonBuilder(req)
    .catch(redirect, function applyRedirect (err) {
      if (err.data.explainationToUser) {
        req.flash('info', err.data.explainationToUser);
      }

      res.redirect(err.data.uri);
    })
    .catch(isRequestError, function respondWith4xx (err) {
      res.status(err.reason).send(err.data.message);
    });
  };
}

module.exports = {
  redirect: redirect,
  isRequestError: isRequestError,
  getAcceptTypeHandler: getAcceptTypeHandler,
  renderPage: renderPage,
  renderJson: renderJson,
  buildJsonHandler: renderJson,
  buildRequestHandler: buildRequestHandler,
  buildGetRequestHandler: buildGetRequestHandler,
  buildPostRequestHandler: buildPostRequestHandler
};