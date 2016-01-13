'use strict';

var each = require('lodash').each;
var isArray = require('lodash').isArray;
var last = require('lodash').last;

module.exports = {
  type: 'CollisionMapValidator',
  deps: ['CollisionMap', 'DefinePlugin', 'Logger'],
  func: function CollisionMapValidator(maps, define, logger) {

    function validateRequiredKeys (key, collisionMap) {
      if (!collisionMap.and) {
        logger().error({key: key, property: 'and'}, 'CollisionMap is missing property.');
      }
      if (!collisionMap.start && !collisionMap.during && !collisionMap.finish) {
        logger().error({key: key}, 'CollisionMap requires at least one callback out of "start", "during" and "finish".');
      }
    }

    function validateMap (map) {
      var ignoreMode = last(map);
      each(ignoreMode, function validateKey (collisionMaps, key) {
        if (!isArray(collisionMaps)) {
          map[key] = [collisionMaps];
          collisionMaps = map[key];
        }

        each(collisionMaps, function (collisionMap) {
          validateRequiredKeys(key, collisionMap);

          if (!isArray(collisionMap.and)) {
            collisionMap.and = [collisionMap.and];
          }
          if (!isArray(collisionMap.start) && collisionMap.start) {
            collisionMap.start = [collisionMap.start];
          }
          if (!isArray(collisionMap.during) && collisionMap.during) {
            collisionMap.during = [collisionMap.during];
          }
          if (!isArray(collisionMap.finish) && collisionMap.finish) {
            collisionMap.finish = [collisionMap.finish];
          }
        });
      });
    }

    function RunValidator () {
      return function validate () {
        each(maps(), validateMap);
      };
    }

    define()('OnServerStart', RunValidator);
    define()('OnClientStart', RunValidator);
  }
};