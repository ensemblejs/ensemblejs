'use strict';

import {filter, map, first, replace, tail} from 'lodash';
import {isInString} from './is';

const splitHistory = {};

function splitString (path) {
  if (splitHistory[path] === undefined) {
    splitHistory[path] = path.split('.');
  }

  return splitHistory[path];
}

function get (node, path) {
  const parts = splitString(path);
  let ref = node;

  for (let i = 0; i < parts.length; i += 1) {
    if (ref[parts[i]] !== undefined) {
      ref = ref[parts[i]];
    } else {
      return undefined;
    }
  }

  return ref;
}

let accessState;
function getArrayById (node, key) {
  let path = key.split(':')[0];
  let suffix = tail(key.split(':')).join(':');

  if (isInString(suffix, '.')) {
    let id = parseInt(suffix.split('.')[0], 10);
    let subPath = replace(suffix, /^[0-9]+\./, '');

    let subNode = first(filter(get(node, path), {id: id}));

    return accessState(subNode, subPath);
  } else {
    let id = parseInt(suffix, 10);
    return first(filter(get(node, path), {id: id}));
  }
}

function getChildren (node, key) {
  let path = key.split('*.')[0];
  let suffix = key.split('*.')[1];

  return map(get(node, path), subNode => accessState(subNode, suffix));
}

accessState = function read(node, key) {
  var prop;

  if (isInString(key, ':')) {
    prop = getArrayById(node, key);
  } else if (isInString(key, '*')) {
    prop = getChildren(node, key);
  } else {
    prop = get(node, key);
  }

  return prop;
};

export const read = accessState;