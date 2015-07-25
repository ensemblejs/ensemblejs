'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'RunValidations',
  deps: ['Validator'],
  func: function (validators) {
    return {
      execute: function execute () {
        each(validators(), function (validator) {
          validator();
        });
      }
    };
  }
};