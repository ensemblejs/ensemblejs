'use strict';

import {isArray} from './is';

export function getById (array, id) {
  for (let i = 0; i < array.length; i += 1) {
    if (array[i].id === id) {
      return array[i];
    }
  }

  return undefined;
}

export function filter (array, predicate) {
  const results = [];

  for (let i = 0; i < array.length; i += 1) {
    if (predicate(array[i])) {
      results.push(array[i]);
    }
  }

  return results;
}

export function join (a, b) {
  Array.prototype.push.apply(a, isArray(b) ? b : [b]);
  return a;
}