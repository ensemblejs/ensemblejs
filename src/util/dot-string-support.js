'use strict';

import {filter, get, map, includes, first, replace, tail} from 'lodash';

let accessState;
function getArrayById (node, key) {
  let path = key.split(':')[0];
  let suffix = tail(key.split(':')).join(':');

  if (includes(suffix, '.')) {
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

  if (includes(key, ':')) {
    prop = getArrayById(node, key);
  } else if (includes(key, '*')) {
    prop = getChildren(node, key);
  } else {
    prop = get(node, key);
  }

  return prop;
};

export const read = accessState;