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

    function doCollisionTest (aKey, bKey, aShapes, saveId, target, callbackDelegate) {

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

      checkAllShapes: for (let i = 0; i < aShapes.length; i += 1) {
        metadata[aKey].target = aShapes[i];

        for (let j = 0; j < bShapes.length; j += 1) {
          metadata[bKey].target = bShapes[j];

          test(aShapes[i], bShapes[j], createOnCollisionCallback);

          if (collided) {
            break checkAllShapes;
          }
        }
      }

      if (!collided) {
        if (!includes(hasStarted, createKey(saveId, aKey, bKey))) {
          return;
        }

        endCollision(target, createKey(saveId, aKey, bKey), callbackDelegate, metadata);
      }
    }

    function detectCollisions (map, saveId, callbackDelegate) {
      each(map, function eachCollisionMap (targets, aKey) {
        for (let t = 0; t < targets.length; t += 1) {
          var aShapes = physicsSystem().getByPhysicsKey(saveId, aKey);

          for (let a = 0; a < targets[t].and.length; a += 1) {
            let bKey = targets[t].and[a];
            doCollisionTest(aKey, bKey, aShapes, saveId, targets[t], callbackDelegate);
          }
        }
      });
    }

    return {
      detectCollisions: detectCollisions
    };
  }
};