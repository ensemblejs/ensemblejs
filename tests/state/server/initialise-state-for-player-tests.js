'use strict';

import expect from 'expect';

var makeTestible = require('../../support').makeTestible;
var defer = require('../../support').defer;

var sut = makeTestible('state/server/mutator');
var mutate = sut[0];
var rawState = sut[1].RawStateAccess();

describe('initialising state for a player', function () {
  let newPlayer;
  let save = {id: 10, mode: 'arcade'};

  function playerSeed1 () {
    return {a: 'b'};
  }

  function playerSeed2 (id) {
    return {c: 'd', in: id};
  }

  beforeEach(() => {
    mutate(10, { players: []});

    var initialiseStateForPlayer = makeTestible('state/server/initialise-state-for-player');

    var seeds = [
      ['arcade', playerSeed1],
      ['arcade', playerSeed2]
    ];

    newPlayer = initialiseStateForPlayer[1].OnNewPlayer(defer(seeds), defer(mutate));
  });

  describe('when a player joins', function () {
    beforeEach(() => {
      newPlayer(save, 1);
    });

    it('should merge all the player defined properties with the id', () => {
      expect(rawState.for(10).toJS()).toEqual({
        players: [
          {id: 1, a: 'b', c: 'd', in: 1}
        ]
      });
    });
  });
});