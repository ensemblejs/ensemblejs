'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var defer = require('../../support').defer;

var tracker = {
  onChangeOf: sinon.spy(),
  onChangeTo: sinon.spy(),
  onElementChanged: sinon.spy(),
  onElementAdded: sinon.spy(),
  onElementRemoved: sinon.spy()
};

function makeValidator(maps) {
  return makeTestible('state/client/trigger-map-loader', {
    TriggerMap: maps,
    StateTracker: tracker
  })[1];
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
      var v = makeValidator([['*', {
        'key': [{ when: 'some-state', data: [1, 'a']}]
      }]]);
      v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onChangeOf: callback, data: [1, 'a']}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual([1, 'a']);
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', eq: {some: 'state'}, call: callback, data: 1}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should not setup a tracker on the object', function () {
          expect(tracker.onChangeTo.called).toEqual(false);
        });
      });
    });

    describe('keys that point to literals', function () {
      describe('onChangeOf', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onChangeOf: callback, data: 'a'}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual('a');
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', eq: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', lt: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', lte: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', gt: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', gte: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onElementAdded: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementAdded.firstCall.args[0]).toEqual('some-state');
        });
      });

      describe('onElementRemoved', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onElementRemoved: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.onElementRemoved.firstCall.args[0]).toEqual('some-state');
        });
      });

      describe('onElementChanged', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onElementChanged: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [
              {when: myFunc, onChangeOf: callback, data: ['a', 1]}
            ]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual(['a', 1]);
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, eq: {some: 'state'}, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.called).toEqual(false);
        });
      });
    });

    describe('keys that point to literals', function () {
      describe('onChangeOf', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, onChangeOf: callback, data: 'a'}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onChangeOf.firstCall.args[2]).toEqual('a');
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, eq: 4, call: callback, data: 1}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, lt: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, lte: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, gt: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, gte: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
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
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, onElementAdded: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementAdded.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onElementAdded.firstCall.args[2]).toEqual(undefined);
        });
      });

      describe('onElementRemoved', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, onElementRemoved: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.onElementRemoved.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onElementRemoved.firstCall.args[2]).toEqual(undefined);
        });
      });

      describe('onElementChanged', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, onElementChanged: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementChanged.firstCall.args[0]).toEqual(myFunc);
          expect(tracker.onElementChanged.firstCall.args[2]).toEqual(undefined);
        });
      });
    });
  });

  describe('with different modes', function () {
    var arcadeCallback = sinon.spy();
    var endlessCallback = sinon.spy();

    beforeEach(function () {
      var arcade = ['arcade', {
        'key': [{ when: 'some-state', onChangeOf: arcadeCallback}]
      }];
      var endless = ['endless', {
        'key': [{ when: 'some-state', onChangeOf: endlessCallback}]
      }];

      var v = makeValidator([arcade, endless]);
      v.OnClientReady(defer('arcade'))();
    });

    it('should setup bindings for "arcade" mode', function () {
      expect(tracker.onChangeOf.firstCall.args[0]).toEqual('some-state');
    });

    it('should not setup bindings for "endless" mode', function () {
      expect(tracker.onChangeOf.callCount).toEqual(1);
    });
  });
});