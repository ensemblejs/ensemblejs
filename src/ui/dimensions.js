'use strict';

module.exports = {
  deps: ['Config', 'Window'],
  type: 'Dimensions',
  func: function Dimensions (config, window) {
    return {
      get: function get () {
        var actualWidth = window().innerWidth;
        var actualHeight = window().innerHeight;
        var ratio = config().client.aspectRatio;
        var heightBasedOnWidth = Math.round(actualWidth / ratio);
        var widthBasedOnHeight = Math.round(actualHeight * ratio);
        var totalMargin = config().client.widescreenMinimumMargin * 2;

        var usableWidth;
        var usableHeight;
        var orientation;

        if (heightBasedOnWidth >= actualHeight) {
          if (widthBasedOnHeight + totalMargin > actualWidth) {
            usableWidth = actualWidth - totalMargin;
            usableHeight = heightBasedOnWidth;
          } else {
            usableWidth = widthBasedOnHeight;
            usableHeight = actualHeight;
          }

          orientation = 'landscape';
        } else {
          if (heightBasedOnWidth + totalMargin > actualHeight) {
            usableWidth = widthBasedOnHeight;
            usableHeight = actualHeight - totalMargin;
          } else {
            usableWidth = actualWidth;
            usableHeight = heightBasedOnWidth;
          }

          orientation = 'portrait';
        }

        return {
          usableWidth: usableWidth,
          usableHeight: usableHeight,
          marginSides: Math.round(actualWidth - usableWidth) / 2,
          marginTopBottom: Math.round(actualHeight - usableHeight) / 2,
          orientation: orientation,
          screenWidth: actualWidth,
          screenHeight: actualHeight,
          ratio: config().client.aspectRatio
        };
      }
    };
  }
};