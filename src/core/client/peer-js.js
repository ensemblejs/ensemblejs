'use strict';

import {on} from '../../';
import {each} from 'lodash';

let Peer = require('peerjs');
let debug = require('../../logging/client/logger').logger.debug;
let info = require('../../logging/client/logger').logger.info;
let error = require('../../logging/client/logger').logger.error;

let peer;
let connections = [];

function getPeerId (saveId, playerNumber, deviceNumber) {
  return `${saveId}-${playerNumber}-${deviceNumber}`;
}

function reconnectToBroker () {
  if (peer === null) {
    return;
  }

  info('Attempting to reconnect to broker.');
  // peer.reconnect();
}

function OnClientReady (eventRouter, SaveId, config) {
  function handleIncomingPacketFromPeer (packet) {
    debug({packet: packet}, 'received data from peer');

    eventRouter().incomingPeerPacket(packet);
  }

  function handleIncomingConnections (connection) {
    info({metadata: connection.metadata}, 'Incoming peer connection.');

    connection.on('open', function () {
      connection.on('data', handleIncomingPacketFromPeer);
    });
  }

  function connectToPeer (saveId, playerNumber, deviceNumber) {
    let peerId = getPeerId(saveId, playerNumber, deviceNumber);

    let metadata = {
      saveId: saveId,
      playerNumber: playerNumber,
      deviceNumber: deviceNumber
    };

    info({peerId: peerId}, 'Attempting to connect to peer');

    var connection = peer.connect(peerId, {metadata: metadata});
    connections.push(connection);

    connection.on('open', function() {
      connection.on('data', handleIncomingPacketFromPeer);
    });
  }

  return function connectToBroker (dims, playerNumber, deviceNumber) {
    if (!config().client.peerLatencyReduction) {
      return;
    }

    let myPeerId = getPeerId(SaveId(), playerNumber, deviceNumber);

    info({myPeerId: myPeerId}, 'Opening connection to PeerJS Broker');

    peer = new Peer(myPeerId, {
      key: process.env.PEERJS_KEY,
      debug: config().peerjs.debugLevel
    });
    peer.on('open', function confirmMyId(id) {
      info({id: id}, 'Connected to PeerJS Broker.');
    });

    peer.on('connection', handleIncomingConnections);
    peer.on('disconnected', function() {
      info('PeerJS disconnected from broker.');
      reconnectToBroker();
    });

    peer.on('error', err => {
      if (err.type === 'peer-unavailable') {
        info({err: err}, 'Could not connect to peer. Probably because we do not reuse peer-ids and have a really simple strategy for connecting to a bunch of peers. Error information supplied.');
      } else {
        error({err: err}, 'PeerJS error.');
      }
    });

    for (let i = 1; i < deviceNumber; i += 1) {
      connectToPeer(SaveId(), playerNumber, i);
    }
  };
}

function OnOutgoingClientPacket (config) {
  return function putPacketOntoInputQueue (packet) {
    if (!config().client.peerLatencyReduction) {
      return;
    }

    each(connections, connection => connection.send(packet));
  };
}

function OnDisconnect () {
  return function disconnectFromBroker () {
    if (peer) {
      info('Disconnecting from PeerJS Broker.');
      peer.disconnect();
      peer = null;
    }
  };
}

on('ClientReady', ['On', 'SaveId', 'Config'], OnClientReady);
on('OutgoingClientPacket', ['Config'], OnOutgoingClientPacket);
on('Disconnect', OnDisconnect);