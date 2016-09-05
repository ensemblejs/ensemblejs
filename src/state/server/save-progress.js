'use strict';

var saves = require('../../util/models/saves');
import read from 'ok-selector';

module.exports = {
  type: 'SaveProgress',
  deps: ['RawStateAccess', 'Time'],
  func: function SaveProgress (raw, time) {

    function now (state) {
      saves.save(raw.for(read(state, 'ensemble.saveId').toJS()), time().present());
    }

    return { now };
  }
};