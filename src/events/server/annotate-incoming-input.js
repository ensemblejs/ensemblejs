'use strict';

module.exports = {
  type: 'OnIncomingClientInputPacket',
  deps: ['Time', 'OnInput'],
  func: function OnIncomingClientInputPacket (time, onInput) {
    return function addTimeToInput (packet, save, deviceId) {
      packet.timestamp = time().present();
      packet.deviceId = deviceId;

      onInput().forEach(callback => (callback(packet, save)));
    };
  }
};