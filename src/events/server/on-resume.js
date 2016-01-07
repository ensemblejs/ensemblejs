'use strict';

module.exports = {
  type: 'OnResume',
  func: function OnResume () {
    return function unpauseSave () {
      return ['ensemble.paused', false];
    };
  }
};