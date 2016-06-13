'use strict';

export function clone (thing) {
  if (thing === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(thing));
}