'use strict';

var forEachMode = require('../../util/modes').forEachMode;

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetection (define, maps, collisionDetectionSystem) {

    define()('OnPhysicsFrame', function CollisionDetection () {
      return function callSystemWithRelevantMapsAndGameId (state) {
        var gameId = state.get('ensemble.gameId');
        var mode = state.get('ensemble.mode');

        forEachMode(maps(), mode, function (map) {
          collisionDetectionSystem().detectCollisions(map, gameId);
        });
      };
    });
  }
};