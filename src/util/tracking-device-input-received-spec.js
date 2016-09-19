import expect from 'expect';
import { update, getBySaveAndDevice, getBySave } from './tracking-device-input-received';

describe('keeping track of input received from devices', () => {
  describe('update for save and device', () => {
    it('should work when no devices for the save have been processed', () => {
      update(1, 2, 3, 4);
      expect(getBySaveAndDevice(1, 2)).toEqual({packetId: 3, frameId: 4});
    });

    it('should set the client frame processed', () => {
      update(1, 2, 6, 8);
      expect(getBySaveAndDevice(1, 2)).toEqual({packetId: 6, frameId: 8});
    });
  });

  describe('getting the values', () => {
    beforeEach(() => {
      update(100, 2, 6, 12);
      update(100, 3, 7, 14);
      update(2, 2, 8, 16);
    })

    it('should return the value for the save/device pair', () => {
      expect(getBySaveAndDevice(100, 2)).toEqual({packetId: 6, frameId: 12});
      expect(getBySaveAndDevice(100, 3)).toEqual({packetId: 7, frameId: 14});
      expect(getBySaveAndDevice(2, 2)).toEqual({packetId: 8, frameId: 16});
    });

    it('should return the value for all devices in the save', () => {
      expect(getBySave(100)).toEqual({
        2: {packetId: 6, frameId: 12},
        3: {packetId: 7, frameId: 14}
      });
    });

    it('should return 0 if not set', () => {
      expect(getBySaveAndDevice(1, 4)).toEqual({packetId: 0, frameId: 0});
      expect(getBySaveAndDevice(3, 2)).toEqual({packetId: 0, frameId: 0});
    })
  })
});