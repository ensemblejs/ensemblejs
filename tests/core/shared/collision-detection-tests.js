'use strict';

var expect = require('expect');
var sinon = require('sinon');

var makeTestible = require('../../support').makeTestible;

var start12 = function () {};
var during12 = function () {};
var finish12 = function () {};

var start13 = function () {};
var during13 = function () {};
var finish13 = function () {};

var physicsSystem;

physicsSystem = makeTestible('core/shared/physics-system')[0];

physicsSystem.register(1, 'key1', 'dot1', {x: 0, y: 0});
physicsSystem.register(1, 'key2', 'dot2', {x: 1, y: 1});
physicsSystem.register(1, 'key3', 'dot3', {x: 2, y: 2});
physicsSystem.register(2, 'key1', 'dot1', {x: 0, y: 0});
physicsSystem.register(2, 'key2', 'dot2', {x: 1, y: 1});
physicsSystem.register(2, 'key3', 'dot3', {x: 0, y: 0});

var callbackDelegate = sinon.spy();

describe('collision detection system', function () {
  beforeEach(function () {
    physicsSystem.updated(1, 'dot1')({x: 0, y: 0});
    physicsSystem.updated(1, 'dot2')({x: 1, y: 1});
    physicsSystem.updated(1, 'dot3')({x: 2, y: 2});
  });

  describe('detecting collisions', function () {
    var cd;
    var map;

    beforeEach(function () {
      map = {
        'key1':
          [{
            and: ['key2'],
            start: [start12],
            during: [during12],
            finish: [finish12]
          },
          {
            and: ['key3'],
            start: [start13],
            during: [during13],
            finish: [finish13]
          }
        ]
      };

      cd = makeTestible('core/shared/collision-detection-system', {
        PhysicsSystem: physicsSystem
      })[0];
    });

    describe('things that are not colliding', function () {
      beforeEach(function () {
        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should not execute callbacks', function () {
        expect(callbackDelegate.called).toEqual(false);
      });
    });

    describe('things that start colliding', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});

        callbackDelegate.reset();

        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should execute the start callbacks', function () {
        expect(callbackDelegate.callCount).toEqual(1);
        expect(callbackDelegate.firstCall.args).toEqual([start13, map.key1[1]]);
      });
    });

    describe('things that collide for two frames in a row', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});

        cd.detectCollisions(map, 1, callbackDelegate);

        callbackDelegate.reset();

        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should execute the during callbacks', function () {
        expect(callbackDelegate.callCount).toEqual(1);
        expect(callbackDelegate.firstCall.args).toEqual([during13, map.key1[1]]);
      });
    });

    describe('things that stop colliding', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});
        cd.detectCollisions(map, 1, callbackDelegate);

        callbackDelegate.reset();

        physicsSystem.updated(1, 'dot3')({x: 2, y: 2});
        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should only execute the finish callback', function () {
        expect(callbackDelegate.callCount).toEqual(1);
        expect(callbackDelegate.firstCall.args).toEqual([finish13, map.key1[1]]);
      });
    });
  });

  describe('multiple physics objects for a key', function () {
    var map;

    beforeEach(function () {
      physicsSystem.register(1, 'multiple1', 'source.a', {x: 0, y: 0});
      physicsSystem.register(1, 'multiple1', 'source.b', {x: 1, y: 1});
      physicsSystem.register(1, 'multiple2', 'source.c', {x: 0, y: 0});
      physicsSystem.register(1, 'multiple2', 'source.d', {x: 1, y: 1});

      map = {
        'multiple1': [{
          and: ['multiple2'],
          start: [start12],
          during: [during12],
          finish: [finish12]
        }]
      };

      var cd = makeTestible('core/shared/collision-detection-system', {
        PhysicsSystem: physicsSystem,
      })[0];

      callbackDelegate.reset();

      cd.detectCollisions(map, 1, callbackDelegate);
    });

    it('should execute the start callbacks', function () {
      expect(callbackDelegate.callCount).toEqual(1);
      expect(callbackDelegate.firstCall.args).toEqual([start12, map.multiple1[0]]);
    });
  });

  describe('multiple saves when running on the server', function () {
    var cd;
    var map1;
    var map2;

    beforeEach(function () {
      physicsSystem.register(1, 'common1', 'dot1', {x: 4, y: 4});
      physicsSystem.register(1, 'common2', 'dot2', {x: 4, y: 4});
      physicsSystem.register(1, 'common3', 'dot3', {x: 4, y: 4});

      physicsSystem.register(2, 'common1', 'dot1', {x: 10, y: 10});
      physicsSystem.register(2, 'common2', 'dot2', {x: 5, y: 5});
      physicsSystem.register(2, 'common3', 'dot3', {x: 10, y: 10});

      map1 = {
        'key1': [{
          and: ['key2'],
          start: [start12],
          during: [during12],
          finish: [finish12]
        }]
      };
      map2 = {
        'key1': [{
          and: ['key3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        }]
      };

      cd = makeTestible('core/shared/collision-detection-system', {
        PhysicsSystem: physicsSystem,
      })[0];

      callbackDelegate.reset();
    });

    it('it should work for game 1', function () {
      cd.detectCollisions(map1, 1, callbackDelegate);

      expect(callbackDelegate.callCount).toEqual(1);
      expect(callbackDelegate.firstCall.args).toEqual([start12, map1.key1[0]]);
    });

    it('it should work for game 2', function () {
      cd.detectCollisions(map1, 2, callbackDelegate);
      cd.detectCollisions(map2, 2, callbackDelegate);

      expect(callbackDelegate.callCount).toEqual(1);
      expect(callbackDelegate.firstCall.args).toEqual([start13, map2.key1[0]]);
    });
  });
});