import expect from 'expect';
import { update, getBySaveAndPlayer, getBySave } from './tracking-device-input-received';

describe('keeping track of input received from devices', () => {
  const save1 = 1;
  const save2 = 2;
  const save3 = 3;
  const save100 = 100;
  const player1 = 1;
  const player2 = 2;
  const player4 = 4;
  const device1 = 1;
  const device2 = 2;

  describe('update for save, player and device', () => {
    it('should work when no devices for the save have been processed', () => {
      update(save1, player1, device1, 3, 4);
      expect(getBySaveAndPlayer(save1, player1)).toEqual([{
        playerId: player1, deviceNumber: device1, packetId: 3, frameId: 4
      }]);
    });

    it('should set the client frame processed and the highest input packet', () => {
      update(save1, player1, device1, 6, 8);
      expect(getBySaveAndPlayer(save1, player1)).toEqual([{
        playerId: player1, deviceNumber: device1, packetId: 6, frameId: 8
      }]);
    });
  });

  describe('getting the values', () => {
    beforeEach(() => {
      update(save100, player1, device1, 6, 12);
      update(save100, player1, device2, 9, 18);
      update(save100, player2, device1, 7, 14);
      update(save2, player1, device1, 8, 16);
    })

    it('should return the value for the save/player pair', () => {
      expect(getBySaveAndPlayer(save100, player1)).toEqual([
        {playerId: player1, deviceNumber: device1, packetId: 6, frameId: 12},
        {playerId: player1, deviceNumber: device2, packetId: 9, frameId: 18}
      ]);
      expect(getBySaveAndPlayer(save100, player2)).toEqual([
        {playerId: player2, deviceNumber: device1, packetId: 7, frameId: 14}
      ]);
      expect(getBySaveAndPlayer(save2, player1)).toEqual([
        {playerId: player1, deviceNumber: device1, packetId: 8, frameId: 16}
      ]);
    });

    it('should return the value for all devices in the save', () => {
      expect(getBySave(save100)).toEqual([
        {playerId: player1, deviceNumber: device1, packetId: 6, frameId: 12},
        {playerId: player1, deviceNumber: device2, packetId: 9, frameId: 18},
        {playerId: player2, deviceNumber: device1, packetId: 7, frameId: 14}
      ]);
    });

    it('should return 0 if not set', () => {
      expect(getBySaveAndPlayer(save1, player4)).toEqual([
        {playerId: player4, deviceNumber: 1, packetId: 0, frameId: 0}
      ]);
      expect(getBySaveAndPlayer(save3, player2)).toEqual([
        {playerId: player2, deviceNumber: 1, packetId: 0, frameId: 0}
      ]);
    })
  })
});