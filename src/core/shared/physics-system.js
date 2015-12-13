'use strict';

var autoResolve = require('distributedlife-sat').shapes.autoResolve;
var map = require('lodash').map;

var physicsThings = {};
var keyMappings = {};

function create (gameId, physicsKey, sourceKey, initialState) {
  keyMappings[gameId] = keyMappings[gameId] || {};
  keyMappings[gameId][physicsKey] = keyMappings[gameId][physicsKey] || [];
  keyMappings[gameId][physicsKey].push(sourceKey);

  physicsThings[gameId] = physicsThings[gameId] || {};
  physicsThings[gameId][sourceKey] = autoResolve(initialState);
}

function updated (gameId, sourceKey) {
  return function calledWhenUpdated (current) {
    physicsThings[gameId][sourceKey] = autoResolve(current);
  };
}

function getBySourceKey (gameId, sourceKey) {
  return physicsThings[gameId][sourceKey];
}

function getByPhysicsKey (gameId, physicsKey) {
  var sourceKeys = keyMappings[gameId][physicsKey];

  return map(sourceKeys, function(sourceKey) {
    return getBySourceKey(gameId, sourceKey);
  });
}

function tick () {
  return;
}

module.exports = {
  type: 'PhysicsSystem',
  func: function PhysicsSystem () {
    return {
      tick: tick,
      getBySourceKey: getBySourceKey,
      getByPhysicsKey: getByPhysicsKey,
      create: create,
      register: create,
      updated: updated
    };
  }
};