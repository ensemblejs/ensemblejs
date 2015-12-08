'use strict';

var expect = require('expect');
var sinon = require('sinon');

var makeTestible = require('../../support').makeTestible;

var start12 = sinon.spy();
var during12 = sinon.spy();
var finish12 = sinon.spy();

var start13 = sinon.spy();
var during13 = sinon.spy();
var finish13 = sinon.spy();

var onEachFrame;
var onServerReady;
var physicsSystem;

physicsSystem = makeTestible('core/shared/physics-system')[0];

physicsSystem.create(1, 'dot1', {x: 0, y: 0});
physicsSystem.create(1, 'dot2', {x: 1, y: 1});
physicsSystem.create(1, 'dot3', {x: 2, y: 2});
physicsSystem.create(2, 'dot1', {x: 0, y: 0});
physicsSystem.create(2, 'dot2', {x: 1, y: 1});
physicsSystem.create(2, 'dot3', {x: 0, y: 0});

var data = {
  'ensemble.gameId': 1,
  'ensemble.mode': 'arcade'
};
var state = {
  get: function (what) {
    return data[what];
  }
};
var data2 = {
  'ensemble.gameId': 2,
  'ensemble.mode': 'endless'
};
var state2 = {
  get: function (what) {
    return data2[what];
  }
};
var data3 = {
  'ensemble.gameId': 3,
  'ensemble.mode': 'arcade'
};
var state3 = {
  get: function (what) {
    return data3[what];
  }
};

describe('collision detection', function () {
  beforeEach(function () {
    physicsSystem.updated(1, 'dot1')({x: 0, y: 0});
    physicsSystem.updated(1, 'dot2')({x: 1, y: 1});
    physicsSystem.updated(1, 'dot3')({x: 2, y: 2});
  });

  describe('on each frame', function () {
    beforeEach(function () {
      var map = ['*', {
        'dot1':
          [{
            and: ['dot2'],
            start: [start12],
            during: [during12],
            finish: [finish12]
          },
          {
            and: ['dot3'],
            start: [start13],
            during: [during13],
            finish: [finish13]
          }
        ]
      }];

      var plugin = makeTestible('core/server/collision-detection', {
        PhysicsSystem: physicsSystem,
        CollisionMap: [map]
      });

      start12.reset();
      during12.reset();
      finish12.reset();

      start13.reset();
      during13.reset();
      finish13.reset();

      onEachFrame = plugin[1].OnPhysicsFrame();
      onServerReady = plugin[1].OnServerReady();
      onServerReady();
    });

    describe('things that are not colliding', function () {
      beforeEach(function () {
        onEachFrame(state);
      });

      it('should not execute callbacks', function () {
        expect(start12.called).toEqual(false);
        expect(during12.called).toEqual(false);
        expect(finish12.called).toEqual(false);
      });
    });

    describe('things that start colliding', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});

        onEachFrame(state);
      });

      it('should execute the start callbacks', function () {
        expect(start13.called).toEqual(true);
        expect(during13.called).toEqual(false);
        expect(finish13.called).toEqual(false);
      });
    });

    describe('things that collide for two frames in a row', function () {
      beforeEach(function () {
        start13.reset();
        during13.reset();
        finish13.reset();

        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});

        onEachFrame(state);
      });

      it('should not execute the start or finsih callbacks', function () {
        expect(start13.called).toEqual(false);
        expect(finish13.called).toEqual(false);
      });

      it('should execute the during callbacks', function () {
        expect(during13.called).toEqual(true);
      });
    });

    describe('things that stop colliding', function () {
      beforeEach(function () {
        start13.reset();
        during13.reset();
        finish13.reset();

        onEachFrame(state);
      });

      it('should only execute the finish callback', function () {
        expect(start13.called).toEqual(false);
        expect(during13.called).toEqual(false);
        expect(finish13.called).toEqual(true);
      });
    });
  });

  describe('collision map support modes', function () {
    beforeEach(function () {
      physicsSystem.updated(1, 'dot1')({x: 0, y: 0});
      physicsSystem.updated(1, 'dot2')({x: 0, y: 0});
      physicsSystem.updated(1, 'dot3')({x: 0, y: 0});

      var map1 = ['*', {
        'dot1': [{
          and: ['dot2'],
          start: [start12],
          during: [during12],
          finish: [finish12]
        }]
      }];
      var map2 = ['endless', {
        'dot1': [{
          and: ['dot3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        }]
      }];

      var plugin = makeTestible('core/server/collision-detection', {
        PhysicsSystem: physicsSystem,
        CollisionMap: [map1, map2]
      });

      start12.reset();
      during12.reset();
      finish12.reset();
      start13.reset();
      during13.reset();
      finish13.reset();

      onEachFrame = plugin[1].OnPhysicsFrame();
      onServerReady = plugin[1].OnServerReady();
      onServerReady();

      onEachFrame(state);
    });

    it('the default should be all modes', function () {
      expect(start12.called).toEqual(true);
      expect(during12.called).toEqual(false);
      expect(finish12.called).toEqual(false);

      expect(start13.called).toEqual(false);
      expect(during13.called).toEqual(false);
      expect(finish13.called).toEqual(false);
    });
  });

  describe('system should support multiple games when running on the server', function () {
    beforeEach(function () {
      physicsSystem.create(3, 'dot1', {x: 4, y: 4});
      physicsSystem.create(3, 'dot2', {x: 4, y: 4});
      physicsSystem.create(3, 'dot3', {x: 4, y: 4});

      physicsSystem.updated(2, 'dot1')({x: 10, y: 10});
      physicsSystem.updated(2, 'dot2')({x: 5, y: 5});
      physicsSystem.updated(2, 'dot3')({x: 10, y: 10});

      var map1 = ['*', {
        'dot1': [{
          and: ['dot2'],
          start: [start12],
          during: [during12],
          finish: [finish12]
        }]
      }];
      var map2 = ['endless', {
        'dot1': [{
          and: ['dot3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        }]
      }];

      var plugin = makeTestible('core/server/collision-detection', {
        PhysicsSystem: physicsSystem,
        CollisionMap: [map1, map2]
      });

      onEachFrame = plugin[1].OnPhysicsFrame();
      onServerReady = plugin[1].OnServerReady();
      onServerReady();

      start12.reset();
      during12.reset();
      finish12.reset();
      start13.reset();
      during13.reset();
      finish13.reset();
    });

    it('it should work for game 1', function () {
      onEachFrame(state3);

      expect(start12.called).toEqual(true);
      expect(during12.called).toEqual(false);
      expect(finish12.called).toEqual(false);

      expect(start13.called).toEqual(false);
      expect(during13.called).toEqual(false);
      expect(finish13.called).toEqual(false);
    });

    it('it should work for game 2', function () {
      onEachFrame(state2);

      expect(start12.called).toEqual(false);
      expect(during12.called).toEqual(false);
      expect(finish12.called).toEqual(false);

      expect(start13.called).toEqual(true);
      expect(during13.called).toEqual(false);
      expect(finish13.called).toEqual(false);
    });
  });
});