'use strict';

function summaryFromSaveState (state) {
  return { id: state._id, mode: state.ensemble.mode };
}

module.exports = {
  summaryFromSaveState: summaryFromSaveState
};