'use strict';

import { each, isArray, isString, isObject, last, filter, includes } from 'lodash';

const Empty = 0;

module.exports = {
  type: 'TriggerMapValidator',
  deps: ['TriggerMap', 'DefinePlugin', 'Logger'],
  func: function TriggerMapValidator(maps, define, logger) {

    const defaultToEqual = ['eq', 'gte', 'gt', 'lte', 'lt', 'onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    const requiresOneOf = ['call', 'onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    const convertToArray = requiresOneOf;

    function shouldDefaultToEqualsTrue (source) {
      const keys = filter(Object.keys(source), key => includes(defaultToEqual, key));
      return keys.length === Empty;
    }

    function isMissingCallback (source) {
      const keys = filter(Object.keys(source), key => includes(requiresOneOf, key));
      return keys.length === Empty;
    }

    function validateMap (map) {
      var ignoreMode = last(map);
      each(ignoreMode, function validateKey (sources, key) {
        if (!isArray(sources)) {
          map[key] = [sources];
          sources = map[key];
        }

        if (sources.length === Empty) {
          logger().error({key: key}, 'Trigger Map entry must have at least one entry.');
        }

        each(sources, function (source) {
          if (!isString(source) && (!isObject(source) || isArray(source))) {
            logger().error({key: key}, 'Trigger Map entry must have either strings or object sources.');
          }

          if (!source.when) {
            logger().error({key: key}, 'Trigger Map entry must have a "when" property.');
          }

          if (shouldDefaultToEqualsTrue(source)) {
            source.eq = true;
          }

          if (isMissingCallback(source)) {
            logger().error({key: key}, 'Trigger Map requires at least one callback: ["call", "onChangeOf", "onElementAdded", "onElementChanged", "onElementRemoved"] property.');
          }

          each(convertToArray, prop => {
            if (source[prop] && !isArray(source[prop])) {
              source[prop] = [source[prop]];
            }
          });
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