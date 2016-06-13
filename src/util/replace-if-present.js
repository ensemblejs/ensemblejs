'use strict';

var each = require('lodash').each;
const { clone } = require('./fast-clone');
var isObject = require('lodash').isObject;

function replaceIfPresent (a, b) {
  var c = clone(a);

  each(a, function (value, property) {
    if (isObject(a[property])) {
      c[property] = replaceIfPresent(a[property], b[property]);
      return;
    }
    if (b[property] !== undefined) {
      c[property] = b[property];
    }
  });

  return c;
}

module.exports = replaceIfPresent;