'use strict';

var expect = require('expect');
var sinon = require('sinon');
var jsdom = require('jsdom').jsdom;
var _ = require('lodash');

describe('the keyboard input capture plugin', function () {
	var InputCapture;
	var inputCapture;
	var socket = {
		emit: sinon.spy()
	};
	var $;

	var document = function() {
		return global.window.document;
	};

	var makeFakeEvent = function(klass, type, options) {
		var event = document().createEvent(klass);
		event.initEvent(type, true, true);
    event = _.defaults(event, options);

    return event;
	};

	var defer = function(dep) {
		return function() {
			return dep;
		};
	};

	beforeEach(function (done) {
		jsdom.env(
			{
				html: '<html><body><canvas id="element"></canvas></body></html>',
				done: function (err, window) {
					global.window = window;
					global.document = window.document;
					global.getComputedStyle = function() {};

					socket.emit.reset();

					$ = require('zepto-browserify').$;

					InputCapture = require('../../../src/input/client/keyboard.js').func(defer(global.window), defer('element'));
					inputCapture = new InputCapture(socket);

					done();
				}
			}
		);
	});

	describe('when a key is pressed', function() {
		it('should register the key as a key', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 32 }));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'space', modifiers: []}]);
		});

		it('should send ctrl modifiers', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 97, ctrlKey: true }));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'a', modifiers: ['ctrl']}]);
		});

		it('should send shift modifiers', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 97, shiftKey: true }));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'a', modifiers: ['shift']}]);
		});

		it('should send alt modifiers', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 97, altKey: true }));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'a', modifiers: ['alt']}]);
		});

		it('should continue to register the mouse click on subsequent calls to getCurrentState', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 32 }));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'space', modifiers: []}]);
			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'space', modifiers: []}]);
		});

		it('should register the key as a single press key', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 32 }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'space', modifiers: []}]);
		});

		it('should send ctrl modifiers', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 97, ctrlKey: true }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'a', modifiers: ['ctrl']}]);
		});

		it('should send shift modifiers', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 97, shiftKey: true }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'a', modifiers: ['shift']}]);
		});

		it('should send alt modifiers', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 97, altKey: true }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'a', modifiers: ['alt']}]);
		});

		it('should remove the single press key after get the current state', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent','keydown', {which: 32 }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'space', modifiers: []}]);
			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([]);
		});

		it('should prevent default for specific keys');
	});

	describe('when the window loses focus and a key is depressed', function() {
		it('should release the key');
	});

	describe('when a key is released', function() {
		it('should remove the key from the current state', function () {
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keydown', {which: 32 }));
			document().dispatchEvent(makeFakeEvent('KeyboardEvent', 'keyup', {which: 32 }));

			expect(inputCapture.getCurrentState().keys).toNotEqual(['space']);
		});

		it('should do nothing if the windowBlue released the key');
	});
});