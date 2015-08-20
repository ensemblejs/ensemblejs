'use strict';

module.exports = {
  type: 'OnResize',
  deps: ['Config'],
  func: function OnResize (config) {
    var $ = require('zepto-browserify').$;

    return function resizeElementAndInputElement (dims) {
      $('#' + config().client.element).css('margin-top', dims.marginTopBottom);
      $('#' + config().client.element).css('width', dims.usableWidth);
      $('#' + config().client.element).css('height', dims.usableHeight);

      $('#' + config().client.inputElement).css('width', dims.usableWidth);
      $('#' + config().client.inputElement).css('height', dims.usableHeight);
    };
  }
};