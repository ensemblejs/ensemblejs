import expect from 'expect';
import sinon from 'sinon';

const module = require('../../../src/core/client/frame-store');

var defer = require('../../support').defer;
var plugins = require('../../support').plugin();

var time = require('../../fake/time').at(2000);


const frameStore = module.func(
  defer({ resetTo: sinon.spy(), get: sinon.spy() }),
  defer({ set: sinon.spy(), clear: sinon.spy() }),
  defer(plugins.define),
  defer(time),
  defer('default'),
  defer(sinon.spy())
);

const frameStorePlugins = plugins.deps();
const seed = frameStorePlugins.OnSeedInitialState();
const incomingServerPacket = frameStorePlugins.OnIncomingServerPacket();

describe.skip('frame store', () => {
  describe('when server state updates arrive', () => {
    let spy;

    beforeEach(() => {
      seed({
        literal: 'value'
      });

      spy = sinon.spy();
    });

    it('should merge literal changes', () => {
      incomingServerPacket({changeDeltas: [{ literal: 'different' }]});

      frameStore.process(0.16, spy);

      // expect(spy.firstCall.args[]).toEqual([0.16, {
      //   literal: 'different'
      // }]);
    });

    it('should merge object changes');
    it('should handle array element addition');
    it('should handle array element removal');
    it('should handle array element modification');
    it('should handle an array element not changing');
    it('should handle multiple change records applying to the same');
  });
});