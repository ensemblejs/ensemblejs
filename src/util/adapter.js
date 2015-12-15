'use strict';

function gameSummaryFromGameState (state) {
  return { id: state._id, mode: state.ensemble.mode };
}

module.exports = {
  gameSummaryFromGameState: gameSummaryFromGameState
};