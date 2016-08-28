'use strict';

const autoResolve = require('distributedlife-sat').shapes.autoResolve;
import {map, reject, uniq} from 'lodash';
import {join} from '../../util/array';

const physicsThings = {};
const keyMappings = {};

function create (saveId, physicsKey, sourceKey, initialState) {
  keyMappings[saveId] = keyMappings[saveId] || {};
  keyMappings[saveId][physicsKey] = keyMappings[saveId][physicsKey] || [];
  keyMappings[saveId][physicsKey].push(sourceKey);

  const stateAsNative = initialState.toJS && initialState.toJS() || initialState;

  physicsThings[saveId] = physicsThings[saveId] || {};
  physicsThings[saveId][sourceKey] = autoResolve(stateAsNative);
}

function updated (saveId, sourceKey, adapter) {
  return function calledWhenUpdated (current) {
    physicsThings[saveId][sourceKey] = adapter ? autoResolve(adapter(current)) : autoResolve(current.toJS());
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
    const physicsModel = adapter ? autoResolve(adapter(current)) : autoResolve(current.toJS());
    physicsModel.id = id;

    physicsThings[saveId][sourceKey].push(physicsModel);
  };
}

function changed (saveId, physicsKey, sourceKey, adapter) {
  return function calledWhenElementChanged (id, current) {
    const physicsModel = adapter ? autoResolve(adapter(current)) : autoResolve(current.toJS());
    physicsModel.id = id;

    physicsThings[saveId][sourceKey] = reject(physicsThings[saveId][sourceKey], {id});
    physicsThings[saveId][sourceKey].push(physicsModel);
  };
}

function removed (saveId, physicsKey, sourceKey) {
  return function calledWhenElementRemoved (id) {
    physicsThings[saveId][sourceKey] = reject(physicsThings[saveId][sourceKey], {id});
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

  const result = [];
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
      added,
      changed,
      create,
      getByPhysicsKey,
      getBySourceKey,
      register: create,
      removed,
      tick,
      updated
    };
  }
};