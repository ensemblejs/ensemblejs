'use strict';

describe('identifying the player', function () {
  describe('when there is no device id', function () {
    it('should report an error');
    it('return a 500');
  });

  describe('when there is a device id', function () {
    describe('when the device is not associated with any player', function () {
      it('should create a new player');
      it('should associate the player and the device');
      it('should set the player on the request');
    });

    describe('when the device is associated with a player', function () {
      it('should set the player on the request');
    });

    describe('when the device is associated with more than one player', function () {
      it('should report an error');
      it('return a 500');
    });
  });
});