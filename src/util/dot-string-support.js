'use strict';

import {filter, map, first, replace, tail} from 'lodash';
import {isInString} from './is';

const Base = 10;
const splitHistory = {};

function splitString (path) {
  if (splitHistory[path] === undefined) {
    splitHistory[path] = path.split('.');
  }

  return splitHistory[path];
}

function get (node, path) {
  return node !== undefined ? node.getIn(splitString(path)) : node;
}

let read;
function getArrayById (node, key) {
  let path = key.split(':')[0];
  let suffix = tail(key.split(':')).join(':');

  if (isInString(suffix, '.')) {
    let id = parseInt(suffix.split('.')[0], Base);
    let subPath = replace(suffix, /^[0-9]+\./, '');

    let subNode = get(node, path).filter(x => x.get('id') === id).first();

    return read(subNode, subPath);
  } else {
    let id = parseInt(suffix, Base);

    return get(node, path).filter(x => x.get('id') === id).first();
  }
}

function getChildren (node, key) {
  let path = key.split('*.')[0];
  let suffix = key.split('*.')[1];

  return get(node, path).map(subNode => read(subNode, suffix));
}

read = function read(node, key) {
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

module.exports = { read };