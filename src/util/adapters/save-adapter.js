'use strict';

export function raw (save) {
  return save;
}

export function summarise (save) {
  return { id: save.id, mode: save.ensemble.mode };
}