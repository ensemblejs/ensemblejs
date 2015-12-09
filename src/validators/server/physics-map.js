'use strict';

var each = require('lodash').each;
var isArray = require('lodash').isArray;
var isString = require('lodash').isString;
var isObject = require('lodash').isObject;
var last = require('lodash').last;

module.exports = {
  type: 'OnServerStart',
  deps: ['PhysicsMap', 'Logger'],
  func: function CollisionMapValidator(maps, logger) {

    function validateMap (map) {
      var ignoreMode = last(map);
      each(ignoreMode, function validateKey (sources, key) {
        if (!isArray(sources)) {
          map[key] = [sources];
          sources = map[key];
        }

        if (sources.length === 0) {
          logger().error('PhysicsMap entry "' + key + '" must have at least one entry.');
        }

        each(sources, function (source) {
          if (!isString(source) && (!isObject(source) || isArray(source))) {
            logger().error('PhysicsMap entry "' + key + '" must have either strings or object sources.');
          }
        });
      });
    }

    return function validate () {
      each(maps(), validateMap);
    };
  }
};