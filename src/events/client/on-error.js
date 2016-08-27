'use strict';

import { logger } from '../../';

module.exports = {
  type: 'OnError',
  func: function OnError () {
    return function formaliseError (data) {
      logger.error(data);

      throw new Error(data);
    };
  }
};