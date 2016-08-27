'use strict';

const { clone } = require('./fast-clone');
const isObject = require('lodash/isObject');
const each = require('lodash/each');

function replaceIfPresent (a, b) {
  const c = clone(a);

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