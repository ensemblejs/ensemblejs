'use strict';

const { each, reject, last, map } = require('lodash');
const sequence = require('distributedlife-sequence');
const Immutable = require('immutable');

module.exports = {
  type: 'FrameStore',
  deps: ['RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time', 'DeviceMode'],
  func: function FrameStore (rawState, queue, define, time, mode) {
    let fromServer;
    let frames = [];
    let inputForNextFrame = [];

    function add (delta) {
      frames.push({
        id: sequence.next('frame'),
        delta,
        timestamp: time().present(),
        input: inputForNextFrame.splice(0),
        pre: null,
        post: null
      });
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
        fromServer = Immutable.fromJS(state);
      };
    }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        fromServer = Immutable.Map(packet.saveState);
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
          timestamp: time().absolute(),
          save: {
            id: 'client',
            mode: mode()
          }
        });
      };
    }

    function process (delta, runLogicOnFrame) {
      add(delta);

      let state = fromServer;

      each(frames, frame => {
        if (!frame.pre) {
          frame.pre = state;
        }
        if (!frame.post) {
          rawState().resetTo(frame.pre.toJS());

          queue().set(frame.input);
          runLogicOnFrame(frame.delta);
          queue().clear();

          frame.post = Immutable.fromJS(rawState().get());
        }

        state = frame.post;
      });
    }

    function reset () {
      frames = [];
      fromServer = null;
      inputForNextFrame = [];
    }

    define()('OnClientStart', OnClientStart);
    define()('OnIncomingServerPacket', OnIncomingServerPacket);
    define()('OnOutgoingClientPacket', HandlePacketLocally);

    return { process, current, reset };
  }
};