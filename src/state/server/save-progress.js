'use strict';

var saves = require('../../util/models/saves');

module.exports = {
  type: 'SaveProgress',
  deps: ['RawStateAccess', 'Time'],
  func: function SaveProgress (raw, time) {

    function now (state) {
      saves.save(raw.for(state.get('ensemble.saveId')), time().present());
    }

    return {
      now: now
    };
  }
};