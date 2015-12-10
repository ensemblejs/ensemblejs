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

var physicsSystem;

physicsSystem = makeTestible('core/shared/physics-system')[0];

physicsSystem.create(1, 'dot1', {x: 0, y: 0});
physicsSystem.create(1, 'dot2', {x: 1, y: 1});
physicsSystem.create(1, 'dot3', {x: 2, y: 2});
physicsSystem.create(2, 'dot1', {x: 0, y: 0});
physicsSystem.create(2, 'dot2', {x: 1, y: 1});
physicsSystem.create(2, 'dot3', {x: 0, y: 0});


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
      };

      cd = makeTestible('core/shared/collision-detection-system', {
        PhysicsSystem: physicsSystem
      })[0];

      start12.reset();
      during12.reset();
      finish12.reset();

      start13.reset();
      during13.reset();
      finish13.reset();
    });

    describe('things that are not colliding', function () {
      beforeEach(function () {
        cd.detectCollisions(map, 1);
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

        cd.detectCollisions(map, 1);
      });

      it('should execute the start callbacks', function () {
        expect(start13.called).toEqual(true);
        expect(during13.called).toEqual(false);
        expect(finish13.called).toEqual(false);
      });
    });

    describe('things that collide for two frames in a row', function () {
      beforeEach(function () {
        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});

        cd.detectCollisions(map, 1);

        start13.reset();
        during13.reset();
        finish13.reset();

        cd.detectCollisions(map, 1);
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
        physicsSystem.updated(1, 'dot3')({x: 0, y: 0});
        cd.detectCollisions(map, 1);

        start13.reset();
        during13.reset();
        finish13.reset();

        physicsSystem.updated(1, 'dot3')({x: 2, y: 2});
        cd.detectCollisions(map, 1);
      });

      it('should only execute the finish callback', function () {
        expect(start13.called).toEqual(false);
        expect(during13.called).toEqual(false);
        expect(finish13.called).toEqual(true);
      });
    });
  });

  describe('system should support multiple games when running on the server', function () {
    var cd;
    var map1;
    var map2;

    beforeEach(function () {
      physicsSystem.create(1, 'dot1', {x: 4, y: 4});
      physicsSystem.create(1, 'dot2', {x: 4, y: 4});
      physicsSystem.create(1, 'dot3', {x: 4, y: 4});

      physicsSystem.updated(2, 'dot1')({x: 10, y: 10});
      physicsSystem.updated(2, 'dot2')({x: 5, y: 5});
      physicsSystem.updated(2, 'dot3')({x: 10, y: 10});

      map1 = {
        'dot1': [{
          and: ['dot2'],
          start: [start12],
          during: [during12],
          finish: [finish12]
        }]
      };
      map2 = {
        'dot1': [{
          and: ['dot3'],
          start: [start13],
          during: [during13],
          finish: [finish13]
        }]
      };

      cd = makeTestible('core/shared/collision-detection-system', {
        PhysicsSystem: physicsSystem,
      })[0];

      start12.reset();
      during12.reset();
      finish12.reset();
      start13.reset();
      during13.reset();
      finish13.reset();
    });

    it('it should work for game 1', function () {
      cd.detectCollisions(map1, 1);

      expect(start12.called).toEqual(true);
      expect(during12.called).toEqual(false);
      expect(finish12.called).toEqual(false);

      expect(start13.called).toEqual(false);
      expect(during13.called).toEqual(false);
      expect(finish13.called).toEqual(false);
    });

    it('it should work for game 2', function () {
      cd.detectCollisions(map1, 2);
      cd.detectCollisions(map2, 2);

      expect(start12.called).toEqual(false);
      expect(during12.called).toEqual(false);
      expect(finish12.called).toEqual(false);

      expect(start13.called).toEqual(true);
      expect(during13.called).toEqual(false);
      expect(finish13.called).toEqual(false);
    });
  });
});