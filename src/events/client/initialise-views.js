'use strict';

var each = require('lodash').each;
var first = require('lodash').first;
var filter = require('lodash').filter;
var intersection = require('lodash').intersection;
var last = require('lodash').last;

module.exports = {
  type: 'OnSetup',
  deps: ['View', 'Dimensions', 'GameMode'],
  func: function OnSetup (views, dimensions, mode) {
    return function initialiseViews () {
      var dims = dimensions().get();

      function hasMatchingMode(callback) {
        return intersection(['*', mode()], first(callback)).length > 0;
      }

      var applicableCallbacks = filter(views(), hasMatchingMode);
      each(applicableCallbacks, function(view) {
        last(view)(dims);
      });
    };
  }
};