'use strict';

module.exports = {
  type: 'OnSetupComplete',
  deps: ['RenderLoop', 'PhysicsLoop'],
  func: function OnSetupComplete (renderLoop, physicsLoop) {
    return function startLoops () {
      renderLoop().run();
      physicsLoop().run();
    };
  }
};