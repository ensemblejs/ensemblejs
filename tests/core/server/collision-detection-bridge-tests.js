'use strict';

var expect = require('expect');
var sinon = require('sinon');
import Immutable from 'immutable';

var makeTestible = require('../../support').makeTestible;

var start12 = sinon.spy();
var during12 = sinon.spy();
var finish12 = sinon.spy();

var start13 = sinon.spy();
var during13 = sinon.spy();
var finish13 = sinon.spy();

var detectCollisions;
var physicsSystem;

physicsSystem = makeTestible('core/shared/physics-system')[0];

physicsSystem.create(1, 'key1', 'dot1', Immutable.fromJS({x: 0, y: 0}));
physicsSystem.create(1, 'key2', 'dot2', Immutable.fromJS({x: 1, y: 1}));
physicsSystem.create(1, 'key3', 'dot3', Immutable.fromJS({x: 2, y: 2}));
physicsSystem.create(2, 'key1', 'dot1', Immutable.fromJS({x: 0, y: 0}));
physicsSystem.create(2, 'key2', 'dot2', Immutable.fromJS({x: 1, y: 1}));
physicsSystem.create(2, 'key3', 'dot3', Immutable.fromJS({x: 0, y: 0}));

var state = Immutable.fromJS({
  ensemble: {
    saveId: 3,
    mode: 'arcade'
  }
});

describe('the collision detection bridge', function () {
  var cd = { detectCollisions: sinon.spy() };

  describe('on each frame', function () {
    beforeEach(function () {
      cd.detectCollisions.reset();

      var map1 = ['*', {
        'key1': [{
          and: ['key2'],
          start: [start12],
          during: [during12],
          finish: [finish12],
          data: ['a', 1, {that: true}]
        }]
      }];
      var map2 = ['endless', {
        'key1': [{
          and: ['key3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        }]
      }];

      var bridge = makeTestible('core/server/collision-detection-bridge', {
        CollisionDetectionSystem: cd,
        CollisionMap: [map1, map2]
      });

      detectCollisions = bridge[0].detectCollisions;
      detectCollisions(0.15, state);
    });

    it('should call the collision detection system for the game', function () {
      expect(cd.detectCollisions.firstCall.args[1]).toEqual(3);
    });

    it('should pass in the application collision maps for the mode', function () {
      expect(cd.detectCollisions.firstCall.args[0]).toEqual({
        'key1': [{
          and: ['key2'],
          start: [start12],
          during: [during12],
          finish: [finish12],
          data: ['a', 1, {that: true}]
        }]
      });
    });

    describe('on collision', function () {
      var onCollisionCallback = sinon.spy();
      var metadata = {meta: 'data'};

      beforeEach(function () {
        cd.detectCollisions = function (map, saveId, callbackDelegate) {
          callbackDelegate(onCollisionCallback, {data:['a', 1, {that: true}]}, metadata);
        };

        detectCollisions(0.15, state);
      });

      afterEach(function () {
        cd.detectCollisions = sinon.spy();
      });

      it('should pass the state and delta to the callback', function () {
        expect(onCollisionCallback.firstCall.args[0]).toEqual(0.15);
        expect(onCollisionCallback.firstCall.args[1]).toEqual(state);
      });

      it('should pass the collision metadata as the third param', function () {
        expect(onCollisionCallback.firstCall.args[2]).toEqual({
          meta: 'data'
        });
      });

      it('should pass in optional data spread as subsequent params', function () {
        expect(onCollisionCallback.firstCall.args[3]).toEqual('a');
        expect(onCollisionCallback.firstCall.args[4]).toEqual(1);
        expect(onCollisionCallback.firstCall.args[5]).toEqual({that: true});
      });
    });
  });
});