'use strict';

import { each, reject, filter } from 'lodash';

module.exports = {
  type: 'OnClientStart',
  deps: ['DefinePlugin'],
  func: function OnClientStart (define) {
    var effects = [];

    return function initialiseEffects () {
      define()('OnPhysicsFrame', function OnRenderFrame () {
        return function tickEffects (delta) {
          each(effects, effect => effect.tick(delta));

          const finished = filter(effects, effect => !effect.isAlive());
          each(finished, effect => effect.done && effect.done());

          effects = reject(effects, effect => !effect.isAlive());
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