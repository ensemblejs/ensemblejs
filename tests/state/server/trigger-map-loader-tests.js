'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;

var trackerBindings = {
  onChangeOf: sinon.spy(),
  onChangeTo: sinon.spy(),
  onElementChanged: sinon.spy(),
  onElementAdded: sinon.spy(),
  onElementRemoved: sinon.spy()
};

var tracker = {
  for: function () {
    return trackerBindings;
  }
};
sinon.spy(tracker, 'for');

var game = { id: 3, mode: 'arcade' };

describe('trigger maps on the server', function () {
  function makeValidator(maps) {
    return makeTestible('state/server/trigger-map-loader', {
      TriggerMap: maps,
      StateTracker: tracker
    })[1];
  }

  beforeEach(function () {
    tracker.for.reset();
    trackerBindings.onChangeOf.reset();
    trackerBindings.onChangeTo.reset();
    trackerBindings.onElementAdded.reset();
    trackerBindings.onElementChanged.reset();
    trackerBindings.onElementRemoved.reset();
  });

  describe('when they have no keys', function () {
    beforeEach(function () {
      var v = makeValidator([['*', {
        'key': [
          { when: 'some-state', data: ['a', 1]}
        ]
      }]]);
      v.OnSaveReady()(game);
    });

    it('should do nothing', function () {
      expect(trackerBindings.onChangeOf.called).toEqual(false);
      expect(trackerBindings.onChangeTo.called).toEqual(false);
      expect(trackerBindings.onElementAdded.called).toEqual(false);
      expect(trackerBindings.onElementChanged.called).toEqual(false);
      expect(trackerBindings.onElementRemoved.called).toEqual(false);
    });
  });

  describe('with each key', function () {
    describe('keys that point to objects or objects', function () {
      describe('onChangeOf', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [
              { when: 'some-state', onChangeOf: callback, data: ['a', 1]}
            ]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeOf.firstCall.args[0]).toEqual('some-state');
          expect(trackerBindings.onChangeOf.firstCall.args[2]).toEqual(['a', 1]);
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', eq: {some: 'state'}, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should not setup a tracker on the object', function () {
          expect(trackerBindings.onChangeTo.called).toEqual(false);
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
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeOf.firstCall.args[0]).toEqual('some-state');
          expect(trackerBindings.onChangeOf.firstCall.args[2]).toEqual('a');
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', eq: 4, call: callback, data: 1}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual('some-state');
          expect(trackerBindings.onChangeTo.firstCall.args[3]).toEqual(1);
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lt', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', lt: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lte', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', lte: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('gt', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', gt: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(true);
        });
      });

      describe('gte', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', gte: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual('some-state');
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(true);
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
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onElementAdded.firstCall.args[0]).toEqual('some-state');
        });
      });

      describe('onElementRemoved', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onElementRemoved: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onElementRemoved.firstCall.args[0]).toEqual('some-state');
        });
      });

      describe('onElementChanged', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: 'some-state', onElementChanged: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onElementChanged.firstCall.args[0]).toEqual('some-state');
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
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeOf.firstCall.args[0]).toEqual(myFunc);
          expect(trackerBindings.onChangeOf.firstCall.args[2]).toEqual(['a', 1]);
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, eq: {some: 'state'}, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should not setup a tracker on the object', function () {
          expect(trackerBindings.onChangeTo.called).toEqual(false);
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
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for all changes', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeOf.firstCall.args[0]).toEqual(myFunc);
          expect(trackerBindings.onChangeOf.firstCall.args[2]).toEqual('a');
        });
      });

      describe('eq', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, eq: 4, call: callback, data: 1}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual(myFunc);
          expect(trackerBindings.onChangeTo.firstCall.args[3]).toEqual(1);
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lt', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, lt: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('lte', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, lte: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(false);
        });
      });

      describe('gt', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, gt: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(true);
        });
      });

      describe('gte', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, gte: 4, call: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onChangeTo.firstCall.args[0]).toEqual(myFunc);
        });

        it('should setup a comparison function', function () {
          expect(trackerBindings.onChangeTo.firstCall.args[1](3)).toEqual(false);
          expect(trackerBindings.onChangeTo.firstCall.args[1](4)).toEqual(true);
          expect(trackerBindings.onChangeTo.firstCall.args[1](5)).toEqual(true);
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
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onElementAdded.firstCall.args[0]).toEqual(myFunc);
        });
      });

      describe('onElementRemoved', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, onElementRemoved: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for element removal', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onElementRemoved.firstCall.args[0]).toEqual(myFunc);
        });
      });

      describe('onElementChanged', function () {
        var callback = sinon.spy();

        beforeEach(function () {
          var v = makeValidator([['*', {
            'key': [{ when: myFunc, onElementChanged: callback}]
          }]]);
          v.OnSaveReady()(game);
        });

        it('should setup a tracker on the object to listen for element insertion', function () {
          expect(tracker.for.firstCall.args).toEqual([3]);
          expect(trackerBindings.onElementChanged.firstCall.args[0]).toEqual(myFunc);
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
      v.OnSaveReady()(game);
    });

    it('should setup bindings for "arcade" mode', function () {
      expect(tracker.for.firstCall.args).toEqual([3]);
      expect(trackerBindings.onChangeOf.firstCall.args[0]).toEqual('some-state');
      expect(trackerBindings.onChangeOf.firstCall.args[2]).toEqual(undefined);
    });

    it('should not setup bindings for "endless" mode', function () {
      expect(trackerBindings.onChangeOf.callCount).toEqual(1);
    });
  });
});