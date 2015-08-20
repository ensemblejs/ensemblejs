'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnSetup',
  deps: ['View', 'Dimensions'],
  func: function OnSetup (views, dimensions) {
    return function initialiseViews () {
      var dims = dimensions().get();

      each(views(), function(view) {
        view(dims);
      });
    };
  }
};