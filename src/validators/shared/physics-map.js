'use strict';

var each = require('lodash').each;
var isArray = require('lodash').isArray;
var isString = require('lodash').isString;
var isObject = require('lodash').isObject;
var last = require('lodash').last;

module.exports = {
  type: 'CollisionMapValidator',
  deps: ['PhysicsMap', 'DefinePlugin', 'Logger'],
  func: function CollisionMapValidator(maps, define, logger) {

    function validateMap (map) {
      var ignoreMode = last(map);
      each(ignoreMode, function validateKey (sources, key) {
        if (!isArray(sources)) {
          map[key] = [sources];
          sources = map[key];
        }

        if (sources.length === 0) {
          logger().error({key: key}, 'PhysicsMap entry must have at least one entry.');
        }

        each(sources, function (source) {
          if (!isString(source) && (!isObject(source) || isArray(source))) {
            logger().error({key: key}, 'PhysicsMap entry must have either strings or object sources.');
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