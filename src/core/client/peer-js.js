'use strict';

import {on} from '../../';

const Peer = require('peerjs');
const debug = require('../../logging/client/logger').logger.debug;
const info = require('../../logging/client/logger').logger.info;
const error = require('../../logging/client/logger').logger.error;

let peer;
const connections = [];

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
    debug({packet}, 'received data from peer');

    eventRouter().incomingPeerPacket(packet);
  }

  function handleIncomingConnections (connection) {
    info({metadata: connection.metadata}, 'Incoming peer connection.');

    connection.on('open', function () {
      connection.on('data', handleIncomingPacketFromPeer);
    });
  }

  function connectToPeer (saveId, playerNumber, deviceNumber) {
    const peerId = getPeerId(saveId, playerNumber, deviceNumber);

    const metadata = { saveId, playerNumber, deviceNumber };

    info({ peerId }, 'Attempting to connect to peer');

    const connection = peer.connect(peerId, { metadata });
    connections.push(connection);

    connection.on('open', function() {
      connection.on('data', handleIncomingPacketFromPeer);
    });
  }

  return function connectToBroker (dims, playerNumber, deviceNumber) {
    if (!config().client.peerLatencyReduction) {
      return;
    }

    const myPeerId = getPeerId(SaveId(), playerNumber, deviceNumber);

    info({myPeerId}, 'Opening connection to PeerJS Broker');

    peer = new Peer(myPeerId, {
      key: process.env.PEERJS_KEY,
      debug: config().peerjs.debugLevel
    });
    peer.on('open', function confirmMyId(id) {
      info({id}, 'Connected to PeerJS Broker.');
    });

    peer.on('connection', handleIncomingConnections);
    peer.on('disconnected', function() {
      info('PeerJS disconnected from broker.');
      reconnectToBroker();
    });

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        info({err}, 'Could not connect to peer. Probably because we do not reuse peer-ids and have a really simple strategy for connecting to a bunch of peers. Error information supplied.');
      } else {
        error({err}, 'PeerJS error.');
      }
    });

    for (let i = 1; i < deviceNumber; i += 1) {
      connectToPeer(SaveId(), playerNumber, i);
    }
  };
}

function OnOutgoingClientPacket (config) {
  return function sendPacketToPeers (packet) {
    if (!config().client.peerLatencyReduction) {
      return;
    }

    connections.forEach((connection) => connection.send(packet));
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