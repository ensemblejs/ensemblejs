'use strict';

var physicsThings = {};
var autoResolve = require('distributedlife-sat').shapes.autoResolve;

function create (key, initialState) {
  physicsThings[key] = autoResolve(initialState);
}

function updated (key) {
  return function calledWhenUpdated (current) {
    physicsThings[key] = autoResolve(current);
  };
}

function get (key) {
  return physicsThings[key];
}

function tick () {}

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