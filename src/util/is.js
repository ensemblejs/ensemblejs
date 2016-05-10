'use strict';

import {isArray as lodashIsArray} from 'lodash';

export function isInString(string, toFind) {
  return string.indexOf(toFind) !== -1;
}

export function isArray (thing) {
  return lodashIsArray(thing);
  // return (thing && Array === thing.constructor);
}