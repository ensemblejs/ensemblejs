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

					InputCapture = require('../../../src/input/client/mouse.js').func(defer(global.window), defer('element'));
					inputCapture = new InputCapture(socket);

					done();
				}
			}
		);
	});

	describe('when the mouse moves', function() {
		it('should update the current x and y values', function () {
			var event = new global.window.document.createEvent('MouseEvent');
			event.initEvent('mousemove', true, true);
	    event = _.defaults(event, {
				layerX: 45,
				layerY: 67
			});

	    $('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().mouse.x).toEqual(45);
			expect(inputCapture.getCurrentState().mouse.y).toEqual(67);
		});
	});

	describe('when a mouse button is clicked', function() {
		it('should register the key as a single press key', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'click', {which: 1 }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'primary', modifiers: []}]);
		});

		it('should remove the single press key after get the current state', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'click', {which: 1 }));

			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([{key: 'primary', modifiers: []}]);
			expect(inputCapture.getCurrentState().singlePressKeys).toEqual([]);
		});
	});

	describe('when a mouse button is pressed', function() {
		it('should register the mouse click as a key', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'mousedown', {which: 1}));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'primary', modifiers: []}]);
		});

		it('should continue to register the mouse click on subsequent calls to getCurrentState', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'mousedown', {which: 1}));

			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'primary', modifiers: []}]);
			expect(inputCapture.getCurrentState().keys).toEqual([{key: 'primary', modifiers: []}]);
		});
	});

	describe('when a mouse button is released', function() {
		it('should remove the mouse click from the current state', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'mousedown', {which: 1}));
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'mouseup', {which: 1}));

			expect(inputCapture.getCurrentState().keys).toNotEqual([{key: 'primary', modifiers: []}]);
		});
	});
});