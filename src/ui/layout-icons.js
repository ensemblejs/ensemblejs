'use strict';

var iconSize = 32;
function position (slot) { return slot * iconSize; }
function iconTop () { return 0; }

function landscape ($) {
  var pos = 0;
  $('.fullscreen').css('top', position(pos) - iconTop() + 'px').css('right', '0');
  pos += 1;
  $('.sound-on').css('top', position(pos) - iconTop() + 'px').css('right', '0');
  $('.sound-off').css('top', position(pos) - iconTop() + 'px').css('right', '0');
  pos += 1;
  $('.disconnected').css('top', position(pos) - iconTop() + 'px').css('right', '0');
  pos += 1;
  $('.paused').css('top', position(pos) - iconTop() + 'px').css('right', '0');
  pos += 1;
}

function portrait ($) {
  var pos = 0;
  $('.fullscreen').css('right', position(pos) + 'px').css('top', iconTop() + 'px');
  pos += 1;
  $('.sound-on').css('right', position(pos) + 'px').css('top', iconTop() + 'px');
  $('.sound-off').css('right', position(pos) + 'px').css('top', iconTop() + 'px');
  pos += 1;
  $('.disconnected').css('right', position(pos) + 'px').css('top', iconTop() + 'px');
  pos += 1;
  $('.paused').css('right', position(pos) + 'px').css('top', iconTop() + 'px');
  pos += 1;
}

module.exports = {
  type: 'OnResize',
  deps: ['$'],
  func: function OnResize ($) {

    return function layoutIcons (dims) {
      if (dims.orientation === 'landscape') {
        landscape($());
      } else {
        portrait($());
      }
    };

  }
};