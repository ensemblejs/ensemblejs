'use strict';

module.exports = {
  type: 'StateSeed',
  func: function trackInputQueueDepth () {
    return {
      ensembleDebug: {
        inputQueueDepth: 0
      }
    };
  }
};