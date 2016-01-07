'use strict';

function summarise (save) {
  return { id: save._id, mode: save.ensemble.mode };
}

module.exports = {
  summarise: summarise
};