'use strict';

import {keys, isNumber, isFunction} from 'lodash';
const returnRequestError = require('./workflow/promise').returnRequestError;

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
      const contentType = getSupportContentType(req, acceptTypeResponseHandlers);
      if (contentType) {
        return acceptTypeResponseHandlers[contentType](req, res);
      }

      const msg = `The following Accept types supported: ${keys(acceptTypeResponseHandlers).join(', ')}`;

      return res.status(406).send(msg);
    });
  };
}

const redirect = (error) => error.reason === 'redirect';
const getSupportedContentType = (req, acceptsHash) => req.accepts(keys(acceptsHash));

function isRequestError (error) {
  return isNumber(error.reason) && error.reason >= 400 && error.reason <= 499;
}

function isServerError (error) {
  return isNumber(error.reason) && error.reason >= 500 && error.reason <= 599;
}

function getAcceptTypeHandler (req, acceptsHash) {
  const acceptType = getSupportedContentType(req, acceptsHash);
  if (acceptType) {
    return acceptsHash[acceptType];
  }

  return returnRequestError(406, `The following Accept types supported: ${keys(acceptsHash).join()}`);
}

function buildAcceptHash (page) {
  return function acceptHash (json) {
    return {
      'html': renderPage(page, json),
      'json': renderJson(json)
    };
  };
}

function get (jsonBuilder, page) {
  return function handleRequest (req, res) {
    jsonBuilder(req)
      .then(buildAcceptHash((isFunction(page) ? page(req) : page)))
      .then((acceptsHash) => getAcceptTypeHandler(req, acceptsHash))
      .then((handler) => handler(req, res))
      .catch(redirect, function applyRedirect (err) {
        if (err.data.explainationToUser) {
          req.flash('info', err.data.explainationToUser);
        }
        res.redirect(err.data.uri);
      })
      .catch(isRequestError, function respondWith4xx (err) {
        res.status(err.reason).send(err.data.message);
      })
      .catch(isServerError, function respondWith5xx (err) {
        console.log(err);
        res.status(err.reason).send(err.data.message);
      });
  };
}

function post (jsonBuilder) {
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
  redirect,
  isRequestError,
  getAcceptTypeHandler,
  renderPage,
  renderJson,
  buildJsonHandler: renderJson,
  buildRequestHandler,
  buildGetRequestHandler: get,
  get,
  buildPostRequestHandler: post,
  post
};