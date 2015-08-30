'use strict';

var rekuire = require('rekuire');
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var last = require('lodash').last;
var sequence = require('distributedlife-sequence');
var filterPluginsByMode = rekuire('src/util/modes').filterPluginsByMode;

module.exports = {
  type: 'SocketServer',
  deps: ['AcknowledgementMap', 'OnInput', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'RawStateAccess', 'StateMutator', 'InitialiseState', 'GamesList', 'StateAccess', 'Logger', 'Config', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time'],
  func: function SocketServer (acknowledgementMaps, onInput, onPlayerConnect, onPlayerDisconnect, onObserverConnect, onObserverDisconnect, rawStateAccess, stateMutator, initialiseState, games, state, logger, config, lowestInputProcessed, on, define, time) {

    var io;
    var sockets = {};

    function packetHasNotChanged (current, prior) {
      return isEqual(current.gameState, prior.gameState);
    }

    function startUpdateClientLoop (game, socketId) {
      var lastPacket = {};

      function updateClient () {
        var packet = {
          gameState: rawStateAccess().for(game.id)
        };

        if (packetHasNotChanged(packet, lastPacket)) {
          return;
        }

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.highestProcessedMessage = lowestInputProcessed()(game.id);
        packet.timestamp = time().present();

        on().outgoingServerPacket(socketId, packet);
      }

      setInterval(updateClient, config().server.pushUpdateFrequency);
    }

    function handleAcknowledgements (socketId, acks, game) {
      each(acks, function (ack) {
        var applicable = filterPluginsByMode(acknowledgementMaps, game.mode);

        each(applicable, function(acknowledgementMap) {
          if (!last(acknowledgementMap)[ack.name]) { return; }

          each(last(acknowledgementMap)[ack.name], function (action) {
            stateMutator()(game.id, action.target(state().for(game.id), ack, action.data));
          });
        });
      });
    }

    function createOnInputFunction (game, socketId) {
      return function onInputFunction (packet) {
        var pendingAcks = packet.pendingAcks;
        delete packet.pendingAcks;

        var now = time().present();
        each(onInput(), function (onInputCallback) {
          onInputCallback(packet, now, game);
        });

        handleAcknowledgements(socketId, pendingAcks, game);
      };
    }

    define()('OnOutgoingServerPacket', function OnServerPacket () {
      return function emitPacket (socketId, packet) {
        sockets[socketId].emit('updateState', packet);
      };
    });

    function createSetupPlayableClientFunction (mode) {
      return function setupPlayableClient (socket) {
        sockets[socket.id] = socket;

        var socketInfo = {
          socketId: socket.id,
          address: socket.handshake.address
        };
        logger().socket(socketInfo, 'connected');

        socket.emit('startTime', time().present());

        var game = {
          id: sequence.next('game-id'),
          mode: mode
        };

        initialiseState().initialise(game);

        function addLogging (eventName, eventCallback) {
          return function withLogging () {
            logger().socket(socketInfo, arguments, eventName);
            eventCallback.apply(this, arguments);
          };
        }

        function publishDisconnect() {
          on().clientDisconnect(game, socket);
        }

        function publishPause () {
          on().pause(game);
        }

        function publishUnpause () {
          on().resume(game);
        }

        function error (data) {
          on().error(data);
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('pause', addLogging('pause', publishPause));
        socket.on('unpause', addLogging('unpause', publishUnpause));
        socket.on('error', addLogging('error', error));
        socket.on('input', createOnInputFunction(game, socket.id));
        socket.emit('initialState', rawStateAccess().for(game.id));

        socket.playerId = sequence.next('playerId');
        socket.emit('playerId', { id: socket.playerId } );

        on().clientConnect(game, socket);

        startUpdateClientLoop(game, socket.id, socket);
      };
    }

    function start (server, modes) {
      io = require('socket.io').listen(server);

      if (modes.length > 0) {
        each(modes, function(mode) {
          io.of('/' + mode + '/primary').on('connection', createSetupPlayableClientFunction(mode));
        });
      } else {
        io.of('/game/primary').on('connection', createSetupPlayableClientFunction('game'));
      }
    }

    function stop () {
      if (io !== undefined) {
        io.close();
      }
    }

    return {
      start: start,
      stop: stop
    };
  }
};