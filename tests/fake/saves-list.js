'use strict';

module.exports = function (mode) {
  return {
    get: (id) => ({ id, mode })
  };
};