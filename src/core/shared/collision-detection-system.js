'use strict';

var each = require('lodash').each;
var remove = require('lodash').remove;
var includes = require('lodash').includes;
var test = require('distributedlife-sat').collision.test;

module.exports = {
  type: 'CollisionDetectionSystem',
  deps: ['PhysicsSystem'],
  func: function CollisionDetectionSystem (physicsSystem) {
    var hasStarted = [];

    function onCollision (target, collisionKey, callbackDelegate, metadata) {
      if (includes(hasStarted, collisionKey)) {
        each(target.during, function (during) {
          callbackDelegate(during, target, metadata);
        });
      } else {
        each(target.start, function (start) {
          callbackDelegate(start, target, metadata);
        });

        hasStarted.push(collisionKey);
      }
    }

    function endCollision (target, collisionKey, callbackDelegate, metadata) {
      each(target.finish, function (finish) {
        callbackDelegate(finish, target, metadata);
      });

      hasStarted = remove(hasStarted, collisionKey);
    }

    function createKey (saveId, key1, key2) {
      return [saveId, ':', key1, ':', key2].join('');
    }

    function detectCollisions (map, saveId, callbackDelegate) {
      each(map, function (targets, aKey) {
        each(targets, function (target) {
          var aShapes = physicsSystem().getByPhysicsKey(saveId, aKey);

          function doCollisionTest (bKey) {
            var collided = false;
            var bShapes = physicsSystem().getByPhysicsKey(saveId, bKey);
            var metadata = {};
            metadata[aKey] = {
              target: undefined,
              shapes: aShapes
            };
            metadata[bKey] = {
              target: undefined,
              shapes: bShapes
            };

            function createOnCollisionCallback () {
              collided = true;
              onCollision(target, createKey(saveId, aKey, bKey), callbackDelegate, metadata);
            }

            each(aShapes, function(a) {
              if (collided) {
                return;
              }

              metadata[aKey].target = a;

              each(bShapes, function(b) {
                if (collided) {
                  return;
                }

                metadata[bKey].target = b;

                if (!test(a, b, createOnCollisionCallback)) {
                  if (!includes(hasStarted, createKey(saveId, aKey, bKey))) {
                    return;
                  }
                }
              });
            });

            if (!collided) {
              if (!includes(hasStarted, createKey(saveId, aKey, bKey))) {
                return;
              }

              endCollision(target, createKey(saveId, aKey, bKey), callbackDelegate, metadata);

              collided = true;
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