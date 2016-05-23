'use strict';

const $ = require('jquery-browserify');

export default $;

module.exports = {
  type: '$',
  func: function jquery () {
    return $;
  }
};