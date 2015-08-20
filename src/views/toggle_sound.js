'use strict';

var each = require('lodash').each;
var $ = require('zepto-browserify').$;

module.exports = {
  type: 'View',
  deps: ['OnMute', 'OnUnmute'],
  func: function View (onMuteCallbacks, onUnmuteCallbacks) {
    return function toggleMuteUnmute () {
      $('.sound-off').hide();
      $('.sound-on').on('click', function () {
        $('.sound-on').hide();
        $('.sound-off').show();

        each(onMuteCallbacks, function(onMuteCallback) {
          onMuteCallback();
        });
      });
      $('.sound-off').on('click', function () {
        $('.sound-off').hide();
        $('.sound-on').show();

        each(onUnmuteCallbacks, function(onUnmuteCallback) {
          onUnmuteCallback();
        });
      });
    };
  }
};