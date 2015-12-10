'use strict';

var each = require('lodash').each;
var remove = require('lodash').remove;
var contains = require('lodash').contains;
var test = require('distributedlife-sat').collision.test;

module.exports = {
  type: 'CollisionDetectionSystem',
  deps: ['PhysicsSystem'],
  func: function CollisionDetectionSystem (physicsSystem) {
    var hasStarted = [];

    function execute (f) { f(); }

    function onCollision (target, collisionKey) {
      if (contains(hasStarted, collisionKey)) {
        each(target.during, execute);
      } else {
        each(target.start, execute);

        hasStarted.push(collisionKey);
      }
    }

    function endCollision (target, collisionKey) {
      each(target.finish, execute);
      hasStarted = remove(hasStarted, collisionKey);
    }

    function createKey (gameId, key1, key2) {
      return [gameId, ':', key1, ':', key2].join('');
    }

    function detectCollisions (map, gameId) {
      each(map, function (targets, aKey) {
        each(targets, function (target) {
          var a = physicsSystem().get(gameId, aKey);

          function doCollisionTest (bKey) {
            var b = physicsSystem().get(gameId, bKey);

            function createOnCollisionCallback () {
              onCollision(target, createKey(gameId, aKey, bKey));
            }

            if (!test(a, b, createOnCollisionCallback)) {
              if (!contains(hasStarted, createKey(gameId, aKey, bKey))) {
                return;
              }

              endCollision(target, createKey(gameId, aKey, bKey));
            }
          }

          each(target.and, doCollisionTest);
        });
      });
    }

    return {
      detectCollisions: detectCollisions
    };
  }
};