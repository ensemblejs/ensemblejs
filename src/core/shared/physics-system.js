'use strict';

var physicsThings = {};
var autoResolve = require('distributedlife-sat').shapes.autoResolve;

function create (gameId, key, initialState) {
  physicsThings[gameId] = physicsThings[gameId] || {};
  physicsThings[gameId][key] = autoResolve(initialState);
}

function updated (gameId, key) {
  return function calledWhenUpdated (current) {
    physicsThings[gameId][key] = autoResolve(current);
  };
}

function get (gameId, key) {
  return physicsThings[gameId][key];
}

function tick (state, delta) {
  //TOOD: bridge to this
  return;
}

module.exports = {
  type: 'PhysicsSystem',
  func: function PhysicsSystem () {
    return {
      tick: tick,
      get: get,
      create: create,
      updated: updated
    };
  }
};