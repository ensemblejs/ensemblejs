'use strict';

var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

var player;
describe('when the client receives the player id', function () {
  beforeEach(function () {
    var sut = makeTestible('core/client/player-id');

    player = sut[0];
    var onClientPlayerId = sut[1].OnClientPlayerId();

    onClientPlayerId(15);
  });

  it('is stored', function () {
    expect(player.id()).toEqual(15);
  });
});