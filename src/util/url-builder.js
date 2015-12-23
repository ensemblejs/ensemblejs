'use strict';

var urlBuilder = function (hostname) {
  return {
    game: function () {
      return {
        index: function () {
          return hostname + '/';
        }
      };
    },
    saves: function (saveId) {
      return {
        join: function () {
          return hostname + '/saves/' + saveId + '/join';
        },
        continue: function () {
          return hostname + '/saves/' + saveId;
        },
        share: function () {
          return hostname + '/saves/' + saveId + '/share';
        },
        full: function () {
          return hostname + '/saves/' + saveId + '/full';
        }
      };
    }
  };
};

module.exports = urlBuilder;