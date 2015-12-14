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

    function onCollision (target, collisionKey, callbackDelegate) {
      if (contains(hasStarted, collisionKey)) {
        each(target.during, function (during) {
          callbackDelegate(during, target);
        });
      } else {
        each(target.start, function (start) {
          callbackDelegate(start, target);
        });

        hasStarted.push(collisionKey);
      }
    }

    function endCollision (target, collisionKey, callbackDelegate) {
      each(target.finish, function (finish) {
        callbackDelegate(finish, target);
      });

      hasStarted = remove(hasStarted, collisionKey);
    }

    function createKey (gameId, key1, key2) {
      return [gameId, ':', key1, ':', key2].join('');
    }

    function detectCollisions (map, gameId, callbackDelegate) {
      each(map, function (targets, aKey) {
        each(targets, function (target) {
          var aShapes = physicsSystem().getByPhysicsKey(gameId, aKey);

          function doCollisionTest (bKey) {
            var collided = false;

            var bShapes = physicsSystem().getByPhysicsKey(gameId, bKey);

            function createOnCollisionCallback () {
              collided = true;
              onCollision(target, createKey(gameId, aKey, bKey), callbackDelegate);
            }

            each(aShapes, function(a) {
              if (collided) {
                return;
              }

              each(bShapes, function(b) {
                if (collided) {
                  return;
                }

                if (!test(a, b, createOnCollisionCallback)) {
                  if (!contains(hasStarted, createKey(gameId, aKey, bKey))) {
                    return;
                  }

                  endCollision(target, createKey(gameId, aKey, bKey), callbackDelegate);

                  collided = true;
                }
              });
            });
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