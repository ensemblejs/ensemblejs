'use strict';

var expect = require('expect');
var sinon = require('sinon');
import Immutable from 'immutable';
var makeTestible = require('../../support').makeTestible;

var start12 = function () { return undefined; };
var during12 = function () { return undefined; };
var finish12 = function () { return undefined; };

var start13 = function () { return undefined; };
var during13 = function () { return undefined; };
var finish13 = function () { return undefined; };

var start14 = function () { return undefined; };

var physicsSystem = makeTestible('core/shared/physics-system')[0];

physicsSystem.register(1, 'key1', 'dot1', Immutable.fromJS({x: 0, y: 0}));
physicsSystem.register(1, 'key2', 'dot2', Immutable.fromJS({x: 1, y: 1}));
physicsSystem.register(1, 'key3', 'dot3', Immutable.fromJS({x: 2, y: 2}));
physicsSystem.register(2, 'key1', 'dot1', Immutable.fromJS({x: 0, y: 0}));
physicsSystem.register(2, 'key2', 'dot2', Immutable.fromJS({x: 1, y: 1}));
physicsSystem.register(2, 'key3', 'dot3', Immutable.fromJS({x: 0, y: 0}));

var callbackDelegate = sinon.spy();

describe('collision detection system', function () {
  beforeEach(function () {
    physicsSystem.updated(1, 'dot1')(Immutable.fromJS({x: 0, y: 0}));
    physicsSystem.updated(1, 'dot2')(Immutable.fromJS({x: 1, y: 1}));
    physicsSystem.updated(1, 'dot3')(Immutable.fromJS({x: 2, y: 2}));
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
        ],
        'empty': [{ and: ['alsoEmpty'], start: [start14]}]
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
        physicsSystem.updated(1, 'dot3')(Immutable.fromJS({x: 0, y: 0}));

        callbackDelegate.reset();

        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should execute the start callbacks', function () {
        expect(callbackDelegate.callCount).toEqual(1);
        expect(callbackDelegate.firstCall.args[0]).toEqual(start13);
      });

      it('should pass through the collision map info', function () {
        expect(callbackDelegate.firstCall.args[1]).toEqual({
          and: ['key3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        });
      });

      it('should pass through the collision metadata', function () {
        expect(callbackDelegate.firstCall.args[2]).toEqual({
          key1: {
            target: {x: 0, y: 0},
            shapes: [{x: 0, y: 0}]
          },
          key3: {
            target: {x: 0, y: 0},
            shapes: [{x: 0, y: 0}]
          }
        });
      });
    });

    describe('things that collide for two frames in a row', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')(Immutable.fromJS({x: 0, y: 0}));

        cd.detectCollisions(map, 1, callbackDelegate);

        callbackDelegate.reset();

        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should execute the during callbacks', function () {
        expect(callbackDelegate.callCount).toEqual(1);
        expect(callbackDelegate.firstCall.args[0]).toEqual(during13);
      });

      it('should pass through the collision map info', function () {
        expect(callbackDelegate.firstCall.args[1]).toEqual({
          and: ['key3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        });
      });

      it('should pass through the collision metadata', function () {
        expect(callbackDelegate.firstCall.args[2]).toEqual({
          key1: {
            target: {x: 0, y: 0},
            shapes: [{x: 0, y: 0}]
          },
          key3: {
            target: {x: 0, y: 0},
            shapes: [{x: 0, y: 0}]
          }
        });
      });
    });

    describe('things that stop colliding', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')(Immutable.fromJS({x: 0, y: 0}));
        cd.detectCollisions(map, 1, callbackDelegate);

        callbackDelegate.reset();

        physicsSystem.updated(1, 'dot3')(Immutable.fromJS({x: 2, y: 2}));
        cd.detectCollisions(map, 1, callbackDelegate);
      });

      it('should only execute the finish callback', function () {
        expect(callbackDelegate.callCount).toEqual(1);
        expect(callbackDelegate.firstCall.args[0]).toEqual(finish13);
      });

      it('should pass through the collision map info', function () {
        expect(callbackDelegate.firstCall.args[1]).toEqual({
          and: ['key3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        });
      });

      it('should pass through the collision metadata', function () {
        expect(callbackDelegate.firstCall.args[2]).toEqual({
          key1: {
            target: {x: 0, y: 0},
            shapes: [{x: 0, y: 0}]
          },
          key3: {
            target: {x: 2, y: 2},
            shapes: [{x: 2, y: 2}]
          }
        });
      });
    });
  });

  describe('multiple physics objects for a key', function () {
    var map;

    beforeEach(function () {
      physicsSystem.register(1, 'multiple1', 'source.a', Immutable.fromJS({x: 0, y: 0}));
      physicsSystem.register(1, 'multiple1', 'source.b', Immutable.fromJS({x: 1, y: 1}));
      physicsSystem.register(1, 'multiple2', 'source.c', Immutable.fromJS({x: 0, y: 0}));
      physicsSystem.register(1, 'multiple2', 'source.d', Immutable.fromJS({x: 1, y: 1}));

      map = {
        'multiple1': [{
          and: ['multiple2'],
          start: [start12],
          during: [during12],
          finish: [finish12]
        }]
      };

      var cd = makeTestible('core/shared/collision-detection-system', {
        PhysicsSystem: physicsSystem
      })[0];

      callbackDelegate.reset();

      cd.detectCollisions(map, 1, callbackDelegate);
    });

    it('should execute the start callbacks', function () {
      expect(callbackDelegate.callCount).toEqual(1);
      expect(callbackDelegate.firstCall.args[0]).toEqual(start12);
    });
  });

  describe('multiple saves when running on the server', function () {
    var cd;
    var map1;
    var map2;

    beforeEach(function () {
      physicsSystem.register(1, 'common1', 'dot1', Immutable.fromJS({x: 4, y: 4}));
      physicsSystem.register(1, 'common2', 'dot2', Immutable.fromJS({x: 4, y: 4}));
      physicsSystem.register(1, 'common3', 'dot3', Immutable.fromJS({x: 4, y: 4}));

      physicsSystem.register(2, 'common1', 'dot1', Immutable.fromJS({x: 10, y: 10}));
      physicsSystem.register(2, 'common2', 'dot2', Immutable.fromJS({x: 5, y: 5}));
      physicsSystem.register(2, 'common3', 'dot3', Immutable.fromJS({x: 10, y: 10}));

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
        PhysicsSystem: physicsSystem
      })[0];

      callbackDelegate.reset();
    });

    it('it should work for game 1', function () {
      cd.detectCollisions(map1, 1, callbackDelegate);

      expect(callbackDelegate.callCount).toEqual(1);
      expect(callbackDelegate.firstCall.args[0]).toEqual(start12);
    });

    it('it should work for game 2', function () {
      cd.detectCollisions(map1, 2, callbackDelegate);
      cd.detectCollisions(map2, 2, callbackDelegate);

      expect(callbackDelegate.callCount).toEqual(1);
      expect(callbackDelegate.firstCall.args[0]).toEqual(start13);
    });
  });
});