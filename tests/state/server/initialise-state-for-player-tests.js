'use strict';

const expect = require('expect');

const { requirePlugin, capture } = require('../../support');
const mutatorDeps = capture();

requirePlugin('state/server/mutator', {}, {
  '../src/': mutatorDeps.define
});

const rawState = mutatorDeps.deps().RawStateAccess();
const mutateNow = mutatorDeps.deps().SyncMutator();

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
    });
  });

  describe('when a player joins', function () {
    beforeEach(() => {
      initialiseStateForPlayer(save, 1);
    });

    it('should merge all the player defined properties with the id', () => {
      expect(rawState.for(save.id).toJS()).toEqual({
        players: [{id: 1, a: 'b', c: 'd', in: 1}]
      });
    });
  });
});