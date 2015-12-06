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

var map;
var onEachFrame;
var physicsSystem = makeTestible('core/shared/physics-system')[0];

describe('collision detection', function () {
  describe('on each frame', function () {
    beforeEach(function () {
      physicsSystem.create('dot1', {x: 0, y: 0});
      physicsSystem.create('dot2', {x: 1, y: 1});
      physicsSystem.create('dot3', {x: 0, y: 0});

      map = {
        'dot1': [
          {
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

      var plugin = makeTestible('core/server/collision-detection', {
        PhysicsSystem: physicsSystem,
        CollisionMap: map
      });

      start12.reset();
      during12.reset();
      finish12.reset();

      start13.reset();
      during13.reset();
      finish13.reset();

      onEachFrame = plugin[1].OnEachFrame();
      onEachFrame();
    });

    describe('things that are not colliding', function () {
      it('should not execute callbacks', function () {
        expect(start12.called).toEqual(false);
        expect(during12.called).toEqual(false);
        expect(finish12.called).toEqual(false);
      });
    });

    describe('things that start colliding', function () {
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

        onEachFrame();
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

        physicsSystem.updated('dot3')({x: 2, y: 2});

        onEachFrame();
      });

      it('should not execute the start and during callbacks', function () {
        expect(start13.called).toEqual(false);
        expect(during13.called).toEqual(false);
      });

      it('should execute the finish callbacks', function () {
        expect(finish13.called).toEqual(true);
      });
    });
  });

  describe('collision map support modes', function () {
    it('should work');
  });
});