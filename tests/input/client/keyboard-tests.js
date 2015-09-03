'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var createFakeDom = require('../../fake/dom');

var fake$ = require('../../fake/jquery').$;
var fake$wrapper = require('../../fake/jquery').fakeWith(fake$);

var sut;
var onSetup;

describe('the keyboard input capture plugin', function () {
	var keyboard;

	before(function () {
		sinon.spy(fake$, 'on');
	});

	beforeEach(function (done) {
		var html = '<html><body><canvas id="element"></canvas></body></html>';

		createFakeDom(html, function (window) {
	  	sut = makeTestible('input/client/keyboard', {
				Window: window,
				$: fake$wrapper
			});
			keyboard = sut[0];
			onSetup = sut[1].OnSetup();
	  }, done);

		fake$.reset();
	});

	after(function () {
		fake$.on.restore();
	});

	describe('after setup', function () {
		beforeEach(function () {
			onSetup();
		});

		describe('when a key is pressed', function() {
			it('should register the key as a key', function () {
				fake$.savedEvents().keydown[0]({which: 32 });

				expect(keyboard().keys).toEqual([{key: 'space', modifiers: []}]);
			});

			it('should send ctrl modifiers', function () {
				fake$.savedEvents().keydown[0]({which: 97, ctrlKey: true });

				expect(keyboard().keys).toEqual([{key: 'a', modifiers: ['ctrl']}]);
			});

			it('should send shift modifiers', function () {
				fake$.savedEvents().keydown[0]({which: 97, shiftKey: true });

				expect(keyboard().keys).toEqual([{key: 'a', modifiers: ['shift']}]);
			});

			it('should send alt modifiers', function () {
				fake$.savedEvents().keydown[0]({which: 97, altKey: true });

				expect(keyboard().keys).toEqual([{key: 'a', modifiers: ['alt']}]);
			});

			it('should continue to register the mouse click on subsequent calls to getCurrentState', function () {
				fake$.savedEvents().keydown[0]({which: 32 });

				expect(keyboard().keys).toEqual([{key: 'space', modifiers: []}]);
				expect(keyboard().keys).toEqual([{key: 'space', modifiers: []}]);
			});

			it('should register the key as a single press key', function () {
				fake$.savedEvents().keydown[0]({which: 32 });

				expect(keyboard().singlePressKeys).toEqual([{key: 'space', modifiers: []}]);
			});

			it('should send ctrl modifiers', function () {
				fake$.savedEvents().keydown[0]({which: 97, ctrlKey: true });

				expect(keyboard().singlePressKeys).toEqual([{key: 'a', modifiers: ['ctrl']}]);
			});

			it('should send shift modifiers', function () {
				fake$.savedEvents().keydown[0]({which: 97, shiftKey: true });

				expect(keyboard().singlePressKeys).toEqual([{key: 'a', modifiers: ['shift']}]);
			});

			it('should send alt modifiers', function () {
				fake$.savedEvents().keydown[0]({which: 97, altKey: true });

				expect(keyboard().singlePressKeys).toEqual([{key: 'a', modifiers: ['alt']}]);
			});

			it('should remove the single press key after get the current state', function () {
				fake$.savedEvents().keydown[0]({which: 32 });

				expect(keyboard().singlePressKeys).toEqual([{key: 'space', modifiers: []}]);
				expect(keyboard().singlePressKeys).toEqual([]);
			});
		});

		describe('when the window loses focus and a key is depressed', function() {
			beforeEach(function () {
				fake$.savedEvents().keydown[0]({which: 32 });
				fake$.savedEvents().blur[0]();
			});

			it('should release the key', function () {
				expect(keyboard().keys).toEqual([]);
			});
		});

		describe('when a key is released', function() {
			beforeEach(function () {
				fake$.savedEvents().keydown[0]({which: 32 });
			});

			it('should remove the key from the current state', function () {
				fake$.savedEvents().keyup[0]({which: 32 });

				expect(keyboard().keys).toNotEqual(['space']);
			});

			it('should do nothing if the windowBlur released the key', function () {
				fake$.savedEvents().blur[0]();
				fake$.savedEvents().keyup[0]({which: 32 });

				expect(keyboard().keys).toNotEqual(['space']);
			});
		});
	});
});