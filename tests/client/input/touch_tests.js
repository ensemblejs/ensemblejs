'use strict';

var expect = require('expect');
var sinon = require('sinon');
var jsdom = require('jsdom').jsdom;
var _ = require('lodash');

describe('the touch input capture plugin', function () {
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

					InputCapture = require('../../../src/input/client/touch.js').func(defer(global.window), defer('element'));
					inputCapture = new InputCapture(socket);

					done();
				}
			}
		);
	});

	describe('when a touch press starts', function() {
		it('should register the touch event', function () {
			var event = makeFakeEvent('TouchEvent', 'touchstart', {
				touches: [{
					identifier: 1,
					clientY: 0,
					clientX: 0,
					target: {
						offsetLeft: 0,
						offsetTop: 0
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches[0].id).toEqual(1);
			expect(inputCapture.getCurrentState().touches[0].force).toEqual(1);
		});

		it('should calculate the touch position', function () {
			var event = makeFakeEvent('TouchEvent', 'touchstart', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches[0].x).toEqual(-55);
			expect(inputCapture.getCurrentState().touches[0].y).toEqual(20);
		});

		it('should use the webkit touch force if it is available', function () {
			var event = makeFakeEvent('TouchEvent', 'touchstart', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					},
					webkitForce: 0.5
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches[0].force).toEqual(0.5);
		});
	});

	describe('when a touch press moves', function() {
		it('should register the touch event', function() {
			var event = makeFakeEvent('TouchEvent', 'touchmove', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches[0].id).toEqual(1);
			expect(inputCapture.getCurrentState().touches[0].force).toEqual(1);
		});

		it('should calculate the touch position', function() {
			var event = makeFakeEvent('TouchEvent', 'touchmove', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches[0].x).toEqual(-55);
			expect(inputCapture.getCurrentState().touches[0].y).toEqual(20);
		});

		it('should use the webkit touch force if it is available', function() {
			var event = makeFakeEvent('TouchEvent', 'touchmove', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					},
					webkitForce: 0.5
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches[0].force).toEqual(0.5);
		});
	});

	describe('when a touch press finishes', function() {
		it('should remove the touch event from the current state', function() {
			var event = makeFakeEvent('TouchEvent', 'touchstart', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			event = makeFakeEvent('TouchEvent', 'touchend', {
				changedTouches: [{
					identifier: 1,
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches).toEqual([]);
		});
	});

	describe('when a touch press leaves the touch area', function() {
		it('should remove the touch event from the current state', function () {
			var event = makeFakeEvent('TouchEvent', 'touchstart', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			event = makeFakeEvent('TouchEvent', 'touchleave', {
				changedTouches: [{
					identifier: 1,
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches).toEqual([]);
		});
	});

	describe('when a touch press is cancelled', function() {
		it('should remove the touch event from the current state', function () {
			var event = makeFakeEvent('TouchEvent', 'touchstart', {
				touches: [{
					identifier: 1,
					clientY: 54,
					clientX: 45,
					target: {
						offsetLeft: 100,
						offsetTop: 34
					}
				}]
			});

			$('#element')[0].dispatchEvent(event);

			event = makeFakeEvent('TouchEvent', 'touchcancel', {
				changedTouches: [{
					identifier: 1,
				}]
			});

			$('#element')[0].dispatchEvent(event);

			expect(inputCapture.getCurrentState().touches).toEqual([]);
		});
	});
});