'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;

module.exports = {
  type: 'OnSetup',
  deps: ['DefinePlugin'],
  func: function OnSetup (define) {
    var effects = [];

    return function initialiseEffects () {
      define()('OnRenderFrame', function OnRenderFrame () {
        return function tickEffects (delta) {
          each(effects, function (effect) {
            effect.tick(delta);
          });

          effects = reject(effects, function (effect) {
            return !effect.isAlive();
          });
        };
      });

      define()('RegisterEffect', function RegisterEffect () {
        return {
          register: function register (effect) {
            effects.push(effect);
          }
        };
      });
    };
  }
};