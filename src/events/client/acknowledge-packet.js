'use strict';

module.exports = {
  type: 'OnServerPacket',
  deps: ['PacketAcknowledgements'],
  func: function OnServerPacket (packetAcknowledgements) {
    return function addPacketToAckList (packet) {
      packetAcknowledgements().add(packet.id);
    };
  }
};