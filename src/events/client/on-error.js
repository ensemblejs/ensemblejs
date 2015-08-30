'use strict';

module.exports = {
  type: 'OnError',
  deps: ['Logger'],
  func: function OnError (logger) {
    return function formaliseError (data) {
      logger().error(data);

      throw new Error(data);
    };
  }
};