'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

var waitingForPlayers = false;
var stateAccess = {
  for: function () {
    return {
      get: function () {
        return waitingForPlayers;
      }
    };
  }
};

var acknowledgements = {
  ack: sinon.spy()
};

var actions = [['*'], {
  'key': [
    {ack: 'key-notWaiting' },
    {ack: 'key-whenWaiting', whenWaiting: true},
    {ack: 'key-onRelease', onRelease: true },
    {ack: 'key-modifiers', modifiers: ['ctrl', 'alt'] },
  ],
  'button1': [
    {ack: 'mouse-notWaiting' },
    {ack: 'mouse-whenWaiting', whenWaiting: true},
  ],
  'touch0': [
    {ack: 'touch-notWaiting' },
    {ack: 'touch-whenWaiting', whenWaiting: true }
  ],
  'cursor': [
    {ack: 'cursor-notWaiting' }
  ],
  'leftStick': [
    {ack: 'leftStick-notWaiting' },
    {ack: 'leftStick-whenWaiting', whenWaiting: true }
  ],
  'rightStick': [
    {ack: 'rightStick-notWaiting' },
    {ack: 'rightStick-whenWaiting', whenWaiting: true }
  ],
}];

describe('input to ack mapper', function () {
  var onOutgoingClientPacket;

  beforeEach(function () {
    var mapper = makeTestible('/input/client/input-to-ack-mapper', {
      ActionMap: [actions],
      ClientAcknowledgements: acknowledgements,
      GameMode: 'arcade',
      StateAccess: stateAccess
    });
    onOutgoingClientPacket = mapper[1].OnOutgoingClientPacket();

    acknowledgements.ack.reset();
  });

  describe('when key input is received', function() {
    it('should register an ack', function() {
      onOutgoingClientPacket({ keys: [{key: 'key'}] });

      expect(acknowledgements.ack.called).toEqual(true);
      expect(acknowledgements.ack.firstCall.args).toEqual(['key-notWaiting']);
      expect(acknowledgements.ack.secondCall.args).toEqual(['key-whenWaiting']);
    });

    it('should ignore the key case', function () {
      onOutgoingClientPacket({ keys: [{key: 'KEY'}] });

      expect(acknowledgements.ack.firstCall.args).toEqual(['key-notWaiting']);
      expect(acknowledgements.ack.secondCall.args).toEqual(['key-whenWaiting']);
    });

    it('should handle onRelease', function() {
      onOutgoingClientPacket({ singlePressKeys: [{key: 'key'}] });

      expect(acknowledgements.ack.callCount).toEqual(1);
      expect(acknowledgements.ack.firstCall.args).toEqual(['key-onRelease']);
    });

    it('should handle waiting for players', function() {
      waitingForPlayers = true;

      onOutgoingClientPacket({ keys: [{key: 'key'}] });

      waitingForPlayers = false;

      expect(acknowledgements.ack.callCount).toEqual(1);
      expect(acknowledgements.ack.firstCall.args).toEqual(['key-whenWaiting']);
    });

    it('should not call bindings w/ modifiers if no modifier pressed', function () {
      onOutgoingClientPacket({ keys: [{key: 'key', modifiers: ['ctrl']}] });

      expect(acknowledgements.ack.called).toEqual(false);
    });

    it('should only call bindings w/ modifiers if modifier pressed', function () {
      onOutgoingClientPacket({ keys: [{key: 'key', modifiers: ['ctrl', 'alt']}] });

      expect(acknowledgements.ack.callCount).toEqual(1);
      expect(acknowledgements.ack.firstCall.args).toEqual(['key-modifiers']);
    });
  });

  describe('when key input is recieved but not bound', function () {
    var onOutgoingClientPacket;

    beforeEach(function () {
      var mapper = makeTestible('/input/client/input-to-ack-mapper', {
        ActionMap: [],
        ClientAcknowledgements: acknowledgements,
        GameMode: 'arcade',
        StateAccess: stateAccess
      });
      onOutgoingClientPacket = mapper[1].OnOutgoingClientPacket();

      acknowledgements.ack.reset();
    });

    it('should do nothing', function () {
      onOutgoingClientPacket({ keys: [{key: 'key'}] });

      expect(acknowledgements.ack.called).toEqual(false);
    });
  });

  describe('when touch input is received', function() {
    it('should register an ack', function() {
      onOutgoingClientPacket({ touches: [{id: 0, x: 4, y: 5}] });

      expect(acknowledgements.ack.callCount).toEqual(2);
      expect(acknowledgements.ack.firstCall.args).toEqual(['touch-notWaiting']);
      expect(acknowledgements.ack.secondCall.args).toEqual(['touch-whenWaiting']);
    });

    it('should handle waiting for players', function() {
      waitingForPlayers = true;

      onOutgoingClientPacket({ touches: [{id: 0, x: 4, y: 5}] });

      waitingForPlayers = false;

      expect(acknowledgements.ack.callCount).toEqual(1);
      expect(acknowledgements.ack.firstCall.args).toEqual(['touch-whenWaiting']);
    });
  });

  describe('when touch is recieved but not bound', function () {
    var onOutgoingClientPacket;

    beforeEach(function () {
      var mapper = makeTestible('/input/client/input-to-ack-mapper', {
        ActionMap: [],
        ClientAcknowledgements: acknowledgements,
        GameMode: 'arcade',
        StateAccess: stateAccess
      });
      onOutgoingClientPacket = mapper[1].OnOutgoingClientPacket();

      acknowledgements.ack.reset();
    });

    it('should do nothing', function () {
      onOutgoingClientPacket({ touches: [{id: 0, x: 4, y: 5}] });
      expect(acknowledgements.ack.called).toEqual(false);
    });
  });

  describe('when mouse click input is received', function() {
    it('should register an ack', function() {
      onOutgoingClientPacket({ keys: [{key: 'button1'}] });

      expect(acknowledgements.ack.callCount).toEqual(2);
      expect(acknowledgements.ack.firstCall.args).toEqual(['mouse-notWaiting']);
      expect(acknowledgements.ack.secondCall.args).toEqual(['mouse-whenWaiting']);
    });

    it('should handle waiting for players', function() {
      waitingForPlayers = true;

      onOutgoingClientPacket({ keys: [{key: 'button1'}] });

      waitingForPlayers = false;

      expect(acknowledgements.ack.callCount).toEqual(1);
      expect(acknowledgements.ack.firstCall.args).toEqual(['mouse-whenWaiting']);
    });
  });

  describe('when mouse input is received but not bound', function() {
    var onOutgoingClientPacket;

    beforeEach(function () {
      var mapper = makeTestible('/input/client/input-to-ack-mapper', {
        ActionMap: [],
        ClientAcknowledgements: acknowledgements,
        GameMode: 'arcade',
        StateAccess: stateAccess
      });
      onOutgoingClientPacket = mapper[1].OnOutgoingClientPacket();

      acknowledgements.ack.reset();
    });

    it('should do nothing', function() {
      onOutgoingClientPacket({ keys: [{key: 'button1'}] });
      expect(acknowledgements.ack.called).toEqual(false);
    });
  });

   describe('when mouse cursor input is received', function() {
    it('should do nothing', function() {
      onOutgoingClientPacket({ x: 6, y: 7 });
      expect(acknowledgements.ack.called).toEqual(false);
    });
  });

  describe('when stick input is received', function () {
    beforeEach(function () {
      waitingForPlayers = false;
    });

    it('should register an ack', function() {
      onOutgoingClientPacket({
        leftStick: {x: 1, y: 1, force: 1}, rightStick: {x: 0, y: 1, force: 1}
      });

      expect(acknowledgements.ack.callCount).toEqual(4);
      expect(acknowledgements.ack.firstCall.args).toEqual(['leftStick-notWaiting']);
      expect(acknowledgements.ack.secondCall.args).toEqual(['leftStick-whenWaiting']);
      expect(acknowledgements.ack.thirdCall.args).toEqual(['rightStick-notWaiting']);
      expect(acknowledgements.ack.lastCall.args).toEqual(['rightStick-whenWaiting']);
    });

    it('should handle waiting for players', function() {
      waitingForPlayers = true;

      onOutgoingClientPacket({
        leftStick: {x: 1, y: 1, force: 1}, rightStick: {x: 0, y: 1, force: 1}
      });

      expect(acknowledgements.ack.callCount).toEqual(2);
      expect(acknowledgements.ack.firstCall.args).toEqual(['leftStick-whenWaiting']);
      expect(acknowledgements.ack.secondCall.args).toEqual(['rightStick-whenWaiting']);
    });
  });

  describe('when stick input is received but not bound', function () {
    var onOutgoingClientPacket;

    beforeEach(function () {
      var mapper = makeTestible('/input/client/input-to-ack-mapper', {
        ActionMap: [],
        ClientAcknowledgements: acknowledgements,
        GameMode: 'arcade',
        StateAccess: stateAccess
      });
      onOutgoingClientPacket = mapper[1].OnOutgoingClientPacket();

      acknowledgements.ack.reset();
    });

    it('should do nothing', function () {
      onOutgoingClientPacket({
        leftStick: {x: 1, y: 1, force: 1}, rightStick: {x: 0, y: 1, force: 1}
      });
      expect(acknowledgements.ack.called).toEqual(false);
    });
  });
});