'use strict';

function sumCallback (total, callback) {
  return total + callback();
}

module.exports = {
  sumCallback: sumCallback
};