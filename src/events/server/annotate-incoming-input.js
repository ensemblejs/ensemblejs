'use strict';

module.exports = {
  type: 'OnIncomingClientInputPacket',
  deps: ['Time', 'OnInput'],
  func: function OnIncomingClientInputPacket (time, onInput) {
    return function addTimeToInput (packet, save) {
      const now = time().present();

      onInput().forEach(callback => (callback(packet, now, save)));
    };
  }
};