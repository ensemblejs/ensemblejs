'use strict';

function paused (state) { return state.ensemble.paused; }

module.exports = {
  paused: paused
};