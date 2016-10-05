'use strict';

module.exports = {
  type: 'OnClientStart',
  deps: ['DefinePlugin'],
  func: function OnClientStart (define) {
    let effects = [];

    return function initialiseEffects () {
      define()('OnPhysicsFrame', function OnRenderFrame () {
        return function tickEffects (Δ) {
          effects.forEach((effect) => effect.tick(Δ));

          const finished = effects.filter((effect) => !effect.isAlive());
          finished.forEach((effect) => effect.done && effect.done());

          effects = effects.filter((effect) => effect.isAlive());
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