'use strict';

var keys = require('lodash').keys;

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

module.exports = {
  renderPage: renderPage,
  buildJsonHandler: buildJsonHandler,
  buildRequestHandler: buildRequestHandler
};