'use strict';

export default function clone (thing) {
  if (thing === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(thing));
}