'use strict';

var autoResolve = require('distributedlife-sat').shapes.autoResolve;
import {map, reject, uniq} from 'lodash';
import {join} from '../../util/array';

var physicsThings = {};
var keyMappings = {};

function create (saveId, physicsKey, sourceKey, initialState) {
  keyMappings[saveId] = keyMappings[saveId] || {};
  keyMappings[saveId][physicsKey] = keyMappings[saveId][physicsKey] || [];
  keyMappings[saveId][physicsKey].push(sourceKey);

  physicsThings[saveId] = physicsThings[saveId] || {};
  physicsThings[saveId][sourceKey] = autoResolve(initialState);
}

function updated (saveId, sourceKey, adapter) {
  return function calledWhenUpdated (current) {
    console.log('updated', current);
    physicsThings[saveId][sourceKey] = adapter ? autoResolve(adapter(current)) : autoResolve(current);
  };
}

function added (saveId, physicsKey, sourceKey, adapter) {
  keyMappings[saveId] = keyMappings[saveId] || {};
  keyMappings[saveId][physicsKey] = keyMappings[saveId][physicsKey] || [];
  keyMappings[saveId][physicsKey].push(sourceKey);
  keyMappings[saveId][physicsKey] = uniq(keyMappings[saveId][physicsKey]);

  physicsThings[saveId] = physicsThings[saveId] || {};
  physicsThings[saveId][sourceKey] = physicsThings[saveId][sourceKey] || [];

  return function calledWhenElementAdded (id, current) {
    let physicsModel = adapter ? autoResolve(adapter(current)) : autoResolve(current);
    physicsModel.id = id;

    physicsThings[saveId][sourceKey].push(physicsModel);
  };
}

function changed (saveId, physicsKey, sourceKey, adapter) {
  return function calledWhenElementChanged (id, current) {
    let physicsModel = adapter ? autoResolve(adapter(current)) : autoResolve(current);
    physicsModel.id = id;

    physicsThings[saveId][sourceKey] = reject(physicsThings[saveId][sourceKey], {id: id});
    physicsThings[saveId][sourceKey].push(physicsModel);
  };
}

function removed (saveId, physicsKey, sourceKey) {
  return function calledWhenElementRemoved (id) {
    physicsThings[saveId][sourceKey] = reject(physicsThings[saveId][sourceKey], {id: id});
  };
}

function getBySourceKey (saveId, sourceKey) {
  return physicsThings[saveId][sourceKey];
}

function getByPhysicsKey (saveId, physicsKey) {
  const sourceKeys = keyMappings[saveId][physicsKey];

  const entries = map(sourceKeys, function(sourceKey) {
    return getBySourceKey(saveId, sourceKey);
  });

  let result = [];
  for (let i = 0; i < entries.length; i += 1) {
    join(result, entries[i]);
  }

  return result;
}

function tick () {
  return;
}

module.exports = {
  type: 'PhysicsSystem',
  func: function EnsemblePhysicsSystem () {
    return {
      tick: tick,
      getBySourceKey: getBySourceKey,
      getByPhysicsKey: getByPhysicsKey,
      create: create,
      register: create,
      updated: updated,
      added: added,
      changed: changed,
      removed: removed
    };
  }
};