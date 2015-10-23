'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnIncomingClientInputPacket',
  deps: ['Time', 'OnInput'],
  func: function OnIncomingClientInputPacket (time, onInput) {
    return function addTimeToInput (packet, game) {
      var now = time().present();

      console.log(packet);

      each(onInput(), function (onInputCallback) {
        onInputCallback(packet, now, game);
      });
    };
  }
};