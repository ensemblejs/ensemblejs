'use strict';

import {on} from '../../events';
import {each} from 'lodash';

let Peer = require('peerjs');
let debug = require('../../logging/client/logger').logger.debug;
let info = require('../../logging/client/logger').logger.info;
let error = require('../../logging/client/logger').logger.error;

const key = '7ia4h3mb62tbuik9';

let peer;
let connections = [];

function getPeerId (saveId, playerNumber, deviceNumber) {
  return `${saveId}-${playerNumber}-${deviceNumber}`;
}

function reconnectToBroker (peer) {
  info('Attempting to reconnect to broker.');
  peer.reconnect();
}

function OnClientReady (eventRouter, SaveId, config) {
  function handleIncomingPacketFromPeer (packet) {
    debug({packet: packet}, 'received data from peer');

    eventRouter().incomingPeerPacket(packet);
  }

  function handleIncomingConnections (connection) {
    info({metadata: connection.medadata}, 'Incoming peer connection.');

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

    console.log(SaveId(), playerNumber, deviceNumber);

    let myPeerId = getPeerId(SaveId(), playerNumber, deviceNumber);

    console.log(myPeerId);

    info('Opening connection to PeerJS Broker');

    peer = new Peer(myPeerId, {key: key, debug: 2});
    peer.on('open', function confirmMyId(id) {
      info({id: id}, 'Connected to PeerJS Broker.');
    });

    peer.on('connection', handleIncomingConnections);
    // peer.on('close', peer.destroy);
    peer.on('disconnected', function() {
      info('PeerJS disconnected from broker.');
      reconnectToBroker(peer);
    });

    peer.on('error', err => error(err, 'PeerJS error.'));

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

on('ClientReady', ['On', 'SaveId', 'Config'], OnClientReady);
on('OutgoingClientPacket', ['Config'], OnOutgoingClientPacket);