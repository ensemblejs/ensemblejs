'use strict';

import { each, reject, last, cloneDeep, map } from 'lodash';
import { next } from 'distributedlife-sequence';
// import define from '../../define';

// var frames = [];

module.exports = {
  type: 'FrameStore',
  deps: ['RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time'],
  func: function FrameStore (rawState, queue, define, time) {
    let fromServer = [];
    let frames = [];
    let inputForNextFrame = [];

    function add (delta) {
      frames.push({
        id: next('frame'),
        delta: delta,
        timestamp: time().present(),
        input: inputForNextFrame,
        pre: null,
        post: null
      });

      inputForNextFrame = [];
    }

    function RecordData () {
      return function callback () {
        console.log(JSON.stringify(frames));
        console.log(JSON.stringify(fromServer));
      };
    }


    function current () {
      return last(frames);
    }

    // function dropFrames (highestProcessedMessage) {
    //   frames = reject(frames, frame => frame.id <= highestProcessedMessage);
    // }

    // function resetPreAndPost () {
    //   frames = map(frames, frame => {
    //     frame.pre = frame.post = null;
    //     return frame;
    //   });
    // }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        fromServer.push(packet);
        // dropFrames(packet.highestProcessedMessage);
        // resetPreAndPost();
      };
    }

    function HandlePacketLocally () {
      // function packetAlreadyOnQueue (packet) {
      //   return includes(map(inputQueue, 'id'), packet.id);
      // }

      return function putPacketOntoInputQueue (packet) {
        // if (!config().client.clientSidePrediction) {
        //   return;
        // }
        // if (packetAlreadyOnQueue(packet)) {
        //   return;
        // }

        inputForNextFrame.push({
          id: packet.id,
          rawData: packet,
          playerId: packet.playerId,
          // timestamp: time().present(),
          save: {
            id: 'client',
            mode: 'default' //mode()
          }
        });
      };
    }

    function process (delta, runLogicOnFrame) {
      add(delta);

      let state = rawState().get();

      each(frames, frame => {
        if (frame.pre === null) {
          frame.pre = cloneDeep(state);
        }
        if (frame.post === null) {
          queue().set(frame.input);

          runLogicOnFrame(frame);

          frame.post = cloneDeep(rawState().get());
          queue().clear();
        }

        state = frame.post;
      });
    }

    define()('OnIncomingServerPacket', OnIncomingServerPacket);
    define()('OnOutgoingClientPacket', HandlePacketLocally);
    define()('OnDisconnect', RecordData);

    return { process, current };
  }
};