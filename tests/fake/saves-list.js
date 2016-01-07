'use strict';

module.exports = function(mode) {
  return {
    get: function (id) {
      return {id: id, mode: mode};
    }
  };
};