'use strict';

var autoResolve = require('distributedlife-sat').shapes.autoResolve;
var map = require('lodash').map;

var physicsThings = {};
var keyMappings = {};

function create (saveId, physicsKey, sourceKey, initialState) {
  keyMappings[saveId] = keyMappings[saveId] || {};
  keyMappings[saveId][physicsKey] = keyMappings[saveId][physicsKey] || [];
  keyMappings[saveId][physicsKey].push(sourceKey);

  physicsThings[saveId] = physicsThings[saveId] || {};
  physicsThings[saveId][sourceKey] = autoResolve(initialState);
}

function updated (saveId, sourceKey) {
  return function calledWhenUpdated (current) {
    console.log(saveId, sourceKey, current);
    physicsThings[saveId][sourceKey] = autoResolve(current);
  };
}

function getBySourceKey (saveId, sourceKey) {
  return physicsThings[saveId][sourceKey];
}

function getByPhysicsKey (saveId, physicsKey) {
  var sourceKeys = keyMappings[saveId][physicsKey];

  return map(sourceKeys, function(sourceKey) {
    return getBySourceKey(saveId, sourceKey);
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