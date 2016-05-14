'use strict';

const UseDeviceAspectRatio = 'device';
const Landscape = 'landscape';
const Portrait = 'portrait';
const Square = 'square';

module.exports = {
  deps: ['Config', 'Window'],
  type: 'Dimensions',
  func: function Dimensions (config, window) {
    function getRatioAsConfigured () {
      if (config().client.aspectRatio === UseDeviceAspectRatio) {
        return window().innerWidth / window().innerHeight;
      } else {
        return config().client.aspectRatio;
      }
    }

    function calculateMargin (actual, usable) {
      return Math.round(actual - usable) / 2;
    }

    function determineOrientation (margins) {
      if (margins.x === margins.y) {
        return Square;
      } else {
        return margins.x > margins.y ? Landscape : Portrait;
      }
    }

    return {
      get: function get () {
        const actualWidth = window().innerWidth;
        const actualHeight = window().innerHeight;
        const ratio = getRatioAsConfigured();
        const heightBasedOnWidth = Math.round(actualWidth / ratio);
        const widthBasedOnHeight = Math.round(actualHeight * ratio);
        const totalMargin = config().client.widescreenMinimumMargin * 2;

        let usableWidth;
        let usableHeight;

        const isSquare = heightBasedOnWidth === widthBasedOnHeight;
        const tooHighToFitScreen = heightBasedOnWidth >= actualHeight;
        const tooHighToFitWithinMargins = heightBasedOnWidth + totalMargin > actualHeight;
        const tooWideToFitWithinMargings = widthBasedOnHeight + totalMargin > actualWidth;

        if (isSquare) {
          usableWidth = actualWidth - totalMargin;
          usableHeight = actualHeight - totalMargin;
        } else {
          if (tooHighToFitScreen) {
            usableHeight = actualHeight;

            if (tooWideToFitWithinMargings) {
              const scaledDownWidth = Math.round((actualHeight - totalMargin) / ratio);
              usableWidth = scaledDownWidth;
            } else {
              usableWidth = widthBasedOnHeight;
            }
          } else {
            usableWidth = actualWidth;

            if (tooHighToFitWithinMargins) {
              const scaledDownHeight = Math.round((actualWidth - totalMargin) / ratio);
              usableHeight = scaledDownHeight;
            } else {
              usableHeight = heightBasedOnWidth;
            }
          }
        }

        const margins = {
          x: calculateMargin(actualWidth, usableWidth),
          y: calculateMargin(actualHeight, usableHeight)
        };

        return {
          usableWidth,
          usableHeight,
          marginSides: margins.x,
          marginTopBottom: margins.y,
          margins,
          orientation: determineOrientation(margins),
          screenWidth: actualWidth,
          screenHeight: actualHeight,
          ratio,
          landscape: function landscape () {
            return orientation === Landscape;
          },
          portrait: function portrait () {
            return orientation === Portrait;
          },
          square: function square () {
            return orientation === Square;
          }
        };
      }
    };
  }
};