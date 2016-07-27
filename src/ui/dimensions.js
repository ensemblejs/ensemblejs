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
      }

      return config().client.aspectRatio;
    }

    const margin = (actual, usable) => Math.round(actual - usable) / 2;

    function determineOrientation (margins) {
      if (margins.x === margins.y) {
        return Square;
      }

      return margins.x > margins.y ? Landscape : Portrait;
    }

    function get () {
      const actualWidth = window().innerWidth;
      const actualHeight = window().innerHeight;
      const ratio = getRatioAsConfigured();
      const heightBasedOnWidth = Math.round(actualWidth / ratio);
      const widthBasedOnHeight = Math.round(actualHeight * ratio);
      const totalMargin = config().client.widescreenMinimumMargin * 2;
      const isSquare = heightBasedOnWidth === widthBasedOnHeight;
      const isTooHighToFitScreen = heightBasedOnWidth >= actualHeight;
      const isTooHighToFitWithinMargins = heightBasedOnWidth + totalMargin > actualHeight;
      const isTooWideToFitWithinMargings = widthBasedOnHeight + totalMargin > actualWidth;

      let usableWidth;
      let usableHeight;

      if (isSquare) {
        usableWidth = actualWidth - totalMargin;
        usableHeight = actualHeight - totalMargin;
      } else if (isTooHighToFitScreen) {
        usableHeight = actualHeight;

        if (isTooWideToFitWithinMargings) {
          const scaledDownWidth = Math.round((actualHeight - totalMargin) / ratio);
          usableWidth = scaledDownWidth;
        } else {
          usableWidth = widthBasedOnHeight - totalMargin;
        }
      } else {
        usableWidth = actualWidth;

        if (isTooHighToFitWithinMargins) {
          const scaledDownHeight = Math.round((actualWidth - totalMargin) / ratio);
          usableHeight = scaledDownHeight;
        } else {
          usableHeight = heightBasedOnWidth - totalMargin;
        }
      }

      const margins = {
        x: margin(actualWidth, usableWidth),
        y: margin(actualHeight, usableHeight)
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
        landscape: () => determineOrientation(margins) === Landscape,
        portrait: () => determineOrientation(margins) === Portrait,
        square: () => determineOrientation(margins) === Square
      };
    }

    return { get };
  }
};