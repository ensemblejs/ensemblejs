'use strict';

import { each, reject, last, map } from 'lodash';
import { next } from 'distributedlife-sequence';
import clone from '../../util/fast-clone';

module.exports = {
  type: 'FrameStore',
  deps: ['RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time'],
  func: function FrameStore (rawState, queue, define, time) {
    let fromServer = null;
    let frames = [];
    let inputForNextFrame = [];

    function add (delta) {
      const frame = {
        id: next('frame'),
        delta: delta,
        timestamp: time().present(),
        input: inputForNextFrame,
        pre: null,
        post: null
      };

      frames.push(frame);

      inputForNextFrame = [];

      // console.log(`{client: {id: ${frame.id}, delta: ${frame.delta}}}`);
    }

    function current () {
      return last(frames);
    }

    function dropFrames (highestProcessedMessage) {
      frames = reject(frames, frame => frame.id <= highestProcessedMessage);
    }

    function resetPreAndPost () {
      frames = map(frames, frame => {
        frame.pre = null;
        frame.post = null;
        return frame;
      });
    }

    function OnClientStart () {
      return function storeInitialServerState (state) {
        fromServer = state;
      };
    }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        // console.log(`fromServer ${packet.saveState.v.x} and dropping packets below ${packet.highestProcessedMessage}.`);

        // console.log(`FromServer comes pellet count of: ${packet.saveState.pacman.pellets.filter(p => p.id >= 162 && p.id <= 168).map(p => p.id)}`);

        // console.log(`Server pos: ${packet.saveState.players[0].pacman.position.x}`);

        fromServer = clone(packet.saveState);
        dropFrames(packet.highestProcessedMessage);
        resetPreAndPost();
      };
    }

    function HandlePacketLocally () {
      return function putPacketOntoInputQueue (packet) {
        inputForNextFrame.push({
          id: packet.id,
          rawData: packet,
          playerId: packet.playerId,
          // timestamp: time().present(), absolute or relative to start?
          save: {
            id: 'client',
            mode: 'default' // TODO: mode()
          }
        });
      };
    }

    function process (delta, runLogicOnFrame) {
      add(delta);

      let state = fromServer;

      // const sx = fromServer.v.x;
      // const sx = fromServer.players[0] && fromServer.players[0].pacman.position.x;
      // const c = frames.length;

      // console.log(`-----------------------`);

      if (state.pacman) {
        // console.log(`Start of Frame pellets: ${state.pacman.pellets.filter(p => p.id >= 162 && p.id <= 168).map(p => p.id)}`);
      }
      if (state.players.length > 0) {
        // console.log(`Start of Frame pos: ${state.players[0].pacman.position.x}`);
      }

      // console.log(`Processing ${frames.length} frames.`);
      // console.log(`Deltas ${frames.map(f => f.delta)}`);

      each(frames, frame => {
        // frame.pre = frame.pre || clone(state);

        // rawState().resetTo(frame.pre);
        rawState().resetTo(clone(fromServer));

        if (frame.post === null) {
          queue().set(frame.input);

          runLogicOnFrame(frame.delta);

          // frame.post = clone(rawState().get());
          queue().clear();
        }

        // state = frame.post;

        // console.log(`> ${frame.id}, p: ${frame.post.v.x}`);
        if (state.players.length > 0) {
          // console.log(`Mid Frame pos: ${state.players[0].pacman.position.x}`);
        }
      });

      if (state.pacman) {
        // console.log(`End of Frame pellets: ${state.pacman.pellets.filter(p => p.id >= 162 && p.id <= 168).map(p => p.id)}`);
      }
      if (state.players.length > 0) {
        // console.log(`End of Frame pos: ${state.players[0].pacman.position.x}`);
      }

      // const cx = state.v.x;
      // const cx = state.players[0] && state.players[0].pacman.position.x;

      // console.log(`Starting with ${sx}, processed: ${c}, result: ${cx}`);
    }

    define()('OnClientStart', OnClientStart);
    define()('OnIncomingServerPacket', OnIncomingServerPacket);
    define()('OnOutgoingClientPacket', HandlePacketLocally);

    return { process, current };
  }
};