'use strict';

const expect = require('expect');

const { requirePlugin } = require('../../support');

const sut = requirePlugin('state/server/mutator');
const rawState = sut[1].RawStateAccess();
const mutateNow = sut[1].SyncMutator();

describe('initialising state for a player', function () {
  const save = {id: 10, mode: 'arcade'};

  const playerSeed1 = () => ({a: 'b'});
  const playerSeed2 = (id) => ({c: 'd', in: id});

  let initialiseStateForPlayer;

  beforeEach(() => {
    mutateNow(save.id, { players: []});

    initialiseStateForPlayer = requirePlugin('state/server/initialise-state-for-player', {
      'PlayerStateSeed': [
        [save.mode, playerSeed1],
        [save.mode, playerSeed2]
      ],
      'SyncMutator': mutateNow
    })[0];
  });

  describe('when a player joins', function () {
    beforeEach(() => {
      initialiseStateForPlayer(save, 1);
    });

    it('should merge all the player defined properties with the id', () => {
      expect(rawState.for(save.id)).toEqual({
        players: [{id: 1, a: 'b', c: 'd', in: 1}]
      });
    });
  });
});