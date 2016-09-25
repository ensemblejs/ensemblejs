'use strict';

module.exports = {
  type: 'Player',
  deps: ['DefinePlugin'],
  func: function (define) {
    let playerId;

    define()('OnClientPlayerId', function () {
      return function setPlayerId (id) {
        playerId = id;
      };
    });

    function id () {
      return playerId;
    }

    return {
      id
    };
  }
};