'use strict';

const expect = require('expect');
const sinon = require('sinon');
const makeTestible = require('../../support').makeTestible;
const defer = require('../../support').defer;
const capture = require('../../support').capture();

const tracker = {
  onChangeOf: sinon.spy(),
  onChangeTo: sinon.spy(),
  onElementChanged: sinon.spy(),
  onElementAdded: sinon.spy(),
  onElementRemoved: sinon.spy()
};

function makeValidator(maps) {
  capture.reset();

  return makeTestible('state/client/trigger-map-loader', {
    TriggerMap: maps,
    StateTracker: tracker
  }, {
    '../src/': {define: capture.define, logger: () => console}
  });
}

describe('trigger maps on the client', function () {

  beforeEach(function () {
    tracker.onChangeOf.reset();
    tracker.onChangeTo.reset();
    tracker.onElementAdded.reset();
    tracker.onElementChanged.reset();
    tracker.onElementRemoved.reset();
  });

  describe('when they have no keys', function () {
    beforeEach(function () {
      makeValidator([['*', {
        'key': [{ when: 'some-state', data: [1, 'a']}]
      }]]);
      capture.deps().OnClientReady(defer('arcade'))();
    });

    it('should do nothing', function () {
      expect(tracker.onChangeOf.called).toEqual(false);
      expect(tracker.onChangeTo.called).toEqual(false);
      expect(tracker.onElementAdded.called).toEqual(false);
      expect(tracker.onElementChanged.called).toEqual(false);
      expect(tracker.onElementRemoved.called).toEqual(false);
    });
  });

  describe('with each key', function () {
    describe('keys that point to objects or objects', function () {
      describe('onChangeOf', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', onChangeOf: callback, data: [1, 'a']}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual([1, 'a']);
        });
      });

      describe('eq', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', eq: {some: 'state'}, call: callback, data: 1}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should not setup a tracker on the object', function () {
          expect(tracker.onChangeTo.called).toEqual(false);
        });
      });
    });

    describe('keys that point to literals', function () {
      describe('onChangeOf', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', onChangeOf: callback, data: 'a'}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual('a');
        });
      });

      describe('eq', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', eq: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lt', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', lt: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lte', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', lte: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('gt', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', gt: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(true);
        });
      });

      describe('gte', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', gte: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(true);
        });
      });
    });

    describe('keys that point to arrays', function () {
      describe('onElementAdded', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', onElementAdded: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementAdded.firstCall.args[0]).toEqual('some-state');
        });
      });

      describe('onElementRemoved', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', onElementRemoved: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.onElementRemoved.firstCall.args[0]).toEqual('some-state');
        });
      });

      describe('onElementChanged', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: 'some-state', onElementChanged: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementChanged.firstCall.args[0]).toEqual('some-state');
        });
      });
    });
  });

  describe('working with lenses', function () {
    function myFunc () { return 'state'; }

    describe('that point to objects or objects', function () {
      describe('onChangeOf', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [
              {when: myFunc, onChangeOf: callback, data: ['a', 1]}
            ]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual(['a', 1]);
        });
      });

      describe('eq', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, eq: {some: 'state'}, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.called).toEqual(false);
        });
      });
    });

    describe('keys that point to literals', function () {
      describe('onChangeOf', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, onChangeOf: callback, data: 'a'}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual('a');
        });
      });

      describe('eq', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, eq: 4, call: callback, data: 1}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onChangeTo.firstCall.args[3]).toEqual(1);
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lt', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, lt: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lte', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, lte: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('gt', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, gt: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(true);
        });
      });

      describe('gte', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, gte: 4, call: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(tracker.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1](5)).toEqual(true);
        });
      });
    });

    describe('keys that point to arrays', function () {
      describe('onElementAdded', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, onElementAdded: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementAdded.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onElementAdded.firstCall.args[2]).toEqual(undefined);
        });
      });

      describe('onElementRemoved', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, onElementRemoved: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.onElementRemoved.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onElementRemoved.firstCall.args[2]).toEqual(undefined);
        });
      });

      describe('onElementChanged', function () {
        const callback = sinon.spy();

        beforeEach(function () {
          makeValidator([['*', {
            'key': [{ when: myFunc, onElementChanged: callback}]
          }]]);
          capture.deps().OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementChanged.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onElementChanged.firstCall.args[2]).toEqual(undefined);
        });
      });
    });
  });

  describe('with different modes', function () {
    const arcadeCallback = sinon.spy();
    const endlessCallback = sinon.spy();

    beforeEach(function () {
      const arcade = ['arcade', {
        'key': [{ when: 'some-state', onChangeOf: arcadeCallback}]
      }];
      const endless = ['endless', {
        'key': [{ when: 'some-state', onChangeOf: endlessCallback}]
      }];

      makeValidator([arcade, endless]);
      capture.deps().OnClientReady(defer('arcade'))();
    });

    it('should setup bindings for "arcade" mode', function () {
      expect(tracker.onChangeOf.firstCall.args[0]).toEqual('some-state');
    });

    it('should not setup bindings for "endless" mode', function () {
      expect(tracker.onChangeOf.callCount).toEqual(1);
    });
  });
});