'use strict';

import { filter, map, first, replace, tail } from 'lodash';
import { isInString } from './is';
import { Map, List } from 'immutable';

const Base = 10;
const Dot = '.';
const Id = ':';
const All = '*';
const splitHistory = {};

function splitString (path) {
  if (splitHistory[path] === undefined) {
    splitHistory[path] = path.split(Dot);
  }

  return splitHistory[path];
}

function getFromJSON (node, path) {
  const parts = splitString(path);
  let ref = node;

  for (let i = 0; i < parts.length; i += 1) {
    if (ref[parts[i]] === undefined) {
      return undefined;
    }

    ref = ref[parts[i]];
  }

  return ref;
}

function getFromImmutable (node, path) {
  return node !== undefined ? node.getIn(splitString(path)) : node;
}

function findObject (node, path, id) {
  return first(filter(getFromJSON(node, path), {id}));
}

function findImmutable (node, path, id) {
  return getFromImmutable(node, path).filter(x => x.get('id') === id).first();
}

function getArrayById (node, key, findNode, read) {
  const path = key.split(Id)[0];
  const suffix = tail(key.split(Id)).join(Id);

  if (isInString(suffix, Dot)) {
    const id = parseInt(suffix.split(Dot)[0], Base);
    const subPath = replace(suffix, /^[0-9]+\./, '');

    const child = findNode(node, path, id);
    return read(child, subPath);
  }

  const id = parseInt(suffix, Base);
  return findNode(node, path, id);
}

let readFromImmutable;
let readFromJSON;
function mapObjectChildren (node, path, suffix) {
  return map(getFromJSON(node, path), child => readFromJSON(child, suffix));
}

function mapImmutableChildren (node, path, suffix) {
  return getFromImmutable(node, path).map(child => readFromImmutable(child, suffix));
}

function getChildren (node, key, mapChildren) {
  const AllChildren = '*.';

  const path = key.split(AllChildren)[0];
  const suffix = key.split(AllChildren)[1];

  return mapChildren(node, path, suffix);
}

readFromJSON = (node, key) => {
  if (isInString(key, Id)) {
    return getArrayById(node, key, findObject, readFromJSON);
  } else if (isInString(key, All)) {
    return getChildren(node, key, mapObjectChildren);
  }

  return getFromJSON(node, key);
};

readFromImmutable = (node, key) => {
  if (isInString(key, Id)) {
    return getArrayById(node, key, findImmutable, readFromImmutable);
  } else if (isInString(key, All)) {
    return getChildren(node, key, mapImmutableChildren);
  }

  return getFromImmutable(node, key);
};

function read (node, key) {
  return Map.isMap(node) || List.isList(node) ? readFromImmutable(node, key) : readFromJSON(node, key);
}

module.exports = { read };