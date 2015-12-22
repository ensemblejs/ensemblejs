'use strict';

function url (route) {
  return {
    uri: 'http://localhost:3000' + route,
    followRedirect: false
  };
}

function log (err) {
  if (!err) {
    return;
  }

  console.error(err);
}

function posturl (path, body) {
  return {
    uri : 'http://localhost:3000' + path,
    method: 'POST',
    body: body,
    json: true,
    followRedirect: false
  };
}

module.exports = {
  url: url,
  log: log,
  posturl: posturl
};