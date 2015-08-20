'use strict';

module.exports = {
  type: 'OnError',
  func: function OnError () {
    return function formaliseError (data) {
      throw new Error(data);
    };
  }
};