'use strict';

module.exports = {
  type: 'OnReady',
  deps: ['RenderLoop', 'PhysicsLoop'],
  func: function OnReady (renderLoop, physicsLoop) {
    return function startLoops () {
      renderLoop().run();
      physicsLoop().run();
    };
  }
};