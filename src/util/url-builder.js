'use strict';

import {map} from 'lodash';

function buildQueryString (q) {
  if (q === undefined) {
    return '';
  }

  var a = map(q, (v, k) => `${k}=${v}`).join('&');
  return q !== undefined ? `?${a}` : '';
}

var urlBuilder = function (hostname) {
  return {
    game: function () {
      return {
        index: function () {
          return `${hostname}/`;
        }
      };
    },
    saves: function (saveId) {
      return {
        join: function (q) {
          return `${hostname}/saves/${saveId}/join${buildQueryString(q)}`;
        },
        continue: function (q) {
          return `${hostname}/saves/${saveId}${buildQueryString(q)}`;
        },
        selectDeviceMode: function (q) {
          return `${hostname}/saves/${saveId}/selectDeviceMode${buildQueryString(q)}`;
        },
        share: function (q) {
          return `${hostname}/saves/${saveId}/share${buildQueryString(q)}`;
        },
        full: function (q) {
          return `${hostname}/saves/${saveId}/full${buildQueryString(q)}`;
        }
      };
    }
  };
};

module.exports = urlBuilder;