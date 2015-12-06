'use strict';

var each = require('lodash').each;
var remove = require('lodash').remove;
var contains = require('lodash').contains;
var test = require('distributedlife-sat').collision.test;

module.exports = {
  type: 'CollisionDetection',
  deps: ['DefinePlugin', 'CollisionMap', 'PhysicsSystem'],
  func: function CollisionDetection (define, map, physicsSystem) {
    define()('OnEachFrame', function CollisionDetection () {
      var hasStarted = [];

      return function thingsSmashTogether () {

        each(map(), function (targets, key) {
          each(targets, function (target) {
            var a = physicsSystem().get(key);

            each(target.and, function (key2) {
              var b = physicsSystem().get(key2);

              var didCollide = false;

              var collisionKey = key + ':' + key2;

              test(a, b, function onCollision () {
                didCollide = true;
                if (contains(hasStarted, collisionKey)) {
                  each(target.during, function (f) {
                    f();
                  });
                } else {
                  each(target.start, function (f) {
                    f();
                  });

                  hasStarted.push(collisionKey);
                }
              });

              if (!didCollide) {
                if (!contains(hasStarted, collisionKey)) {
                  return;
                }

                each(target.finish, function (f) {
                  f();
                });

                remove(hasStarted, collisionKey);
              }
            });

          });
        });

      };
    });
  }
};