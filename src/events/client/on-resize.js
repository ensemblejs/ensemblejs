'use strict';

module.exports = {
  type: 'OnResize',
  deps: ['Config', '$'],
  func: function OnResize (config, $) {
    return function resizeElementAndInputElement (dims) {
      var element = config().client.element;
      var inputElement = config().client.inputElement;

      $()('#' + element).css('margin-top', dims.marginTopBottom);
      $()('#' + element).css('width', dims.usableWidth);
      $()('#' + element).css('height', dims.usableHeight);

      $()('#' + inputElement).css('width', dims.usableWidth);
      $()('#' + inputElement).css('height', dims.usableHeight);
    };
  }
};