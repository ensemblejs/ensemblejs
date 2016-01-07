'use strict';

module.exports = {
  type: 'OnClientConnect',
  deps: ['DefinePlugin', 'Time', 'Profiler'],
  func: function OnClientConnect (define, time, profiler) {
    var statistics = {};

    function getLatencyForSocket (socketId) {
      return statistics[socketId].latency.results();
    }

    define()('OnOutgoingServerPacket', function TrackLatency () {
      return function recordOutgoingPacket (socketId, packet) {
        statistics[socketId].packets[packet.id] = packet.timestamp;
      };
    });

    return function setupLatencyCalculation (state, socket) {
      statistics[socket.id] = {
        latency: profiler().timer('ensemblejs', 'socket', 'latency', 1),
        packets: {}
      };

      function calculateLatency (packetId) {
        var now = time().present();

        var emitTime = statistics[socket.id].packets[packetId];
        var packetLatency = now - emitTime;

        statistics[socket.id].latency.manual(packetLatency);

        delete statistics[socket.id].packets[packetId];
      }

      socket.on('ack', calculateLatency);

      define()('InternalState', function TrackLatency () {
        return {
          SocketServer: {
            latency: function latency () {
              return getLatencyForSocket(socket.id);
            }
          }
        };
      });
    };
  }
};