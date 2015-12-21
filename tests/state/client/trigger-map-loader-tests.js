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

describe('trigger maps', function () {
  function makeValidator(maps) {
    return makeTestible('state/client/trigger-map-loader', {
      TriggerMap: maps,
      StateTracker: tracker
    })[1];
  }

  beforeEach(function () {
    tracker.onChangeOf.reset();
    tracker.onChangeTo.reset();
    tracker.onElementAdded.reset();
    tracker.onElementChanged.reset();
    tracker.onElementRemoved.reset();
  });

  describe('when they have no keys', function () {
    beforeEach(function () {
      var v = makeValidator([]);
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
            'some-state': [{ onChangeOf: callback, data: [1, 'a']}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args).toEqual(['some-state', callback, [1, 'a']]);
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'some-state': [{ eq: {some: 'state'}, call: callback, data: 1}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeTo.firstCall.args[2]).toEqual(callback);
          expect(tracker.onChangeTo.firstCall.args[3]).toEqual(1);
        });

        it('should setup a comparison function', function () {
          expect(tracker.onChangeTo.firstCall.args[1]({some: 'state'})).toEqual(true);
          expect(tracker.onChangeTo.firstCall.args[1]({some: 'derp'})).toEqual(false);
        });
      });
    });

    describe('keys that point to literals', function () {
      describe('onChangeOf', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'some-state': [{ onChangeOf: callback, data: 'a'}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.onChangeOf.firstCall.args).toEqual(['some-state', callback, 'a']);
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'some-state': [{ eq: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeTo.firstCall.args[2]).toEqual(callback);
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
            'some-state': [{ lt: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeTo.firstCall.args[2]).toEqual(callback);
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
            'some-state': [{ lte: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeTo.firstCall.args[2]).toEqual(callback);
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
            'some-state': [{ gt: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeTo.firstCall.args[2]).toEqual(callback);
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
            'some-state': [{ gte: 4, call: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(tracker.onChangeTo.firstCall.args[2]).toEqual(callback);
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
            'some-state': [{ onElementAdded: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementAdded.firstCall.args).toEqual(['some-state', callback, undefined]);
        });
      });

      describe('onElementRemoved', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'some-state': [{ onElementRemoved: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.onElementRemoved.firstCall.args).toEqual(['some-state', callback, undefined]);
        });
      });

      describe('onElementChanged', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'some-state': [{ onElementChanged: callback}]
          }]]);
          v.OnClientReady(defer('arcade'))();
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.onElementChanged.firstCall.args).toEqual(['some-state', callback, undefined]);
        });
      });
    });
  });

  describe('with different modes', function () {
    var arcadeCallback = sinon.spy();
    var endlessCallback = sinon.spy();

    beforeEach(function () {
      var arcade = ['arcade', {
        'some-state': [{ onChangeOf: arcadeCallback}]
      }];
      var endless = ['endless', {
        'some-state': [{ onChangeOf: endlessCallback}]
      }];

      var v = makeValidator([arcade, endless]);
      v.OnClientReady(defer('arcade'))();
    });

    it('should setup bindings for "arcade" mode', function () {
      expect(tracker.onChangeOf.firstCall.args).toEqual(['some-state', arcadeCallback, undefined]);
    });

    it('should not setup bindings for "endless" mode', function () {
      expect(tracker.onChangeOf.callCount).toEqual(1);
    });
  });
});