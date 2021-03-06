'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var createFakeDom = require('../../fake/dom');

var fake$ = require('../../fake/jquery').$;
var fake$wrapper = require('../../fake/jquery').fakeWith(fake$);

var sut;
var onClientStart;

describe('the touch input capture plugin', function () {
	var getCurrentState;

	before(function () {
		sinon.spy(fake$, 'on');
	});

	beforeEach(function (done) {
		var html = '<html><body><canvas id="element"></canvas></body></html>';

		createFakeDom(html, function (window) {
	  	sut = makeTestible('input/client/touch', {
				Window: window,
				Config: {
					client: {
						element: 'element'
					}
				},
				$: fake$wrapper,
				DeviceMode: { name: 'primary', supportedInput: ['touch'] }
			});
			getCurrentState = sut[0];
			onClientStart = sut[1].OnClientStart();
	  }, done);

		fake$.reset();
	});

	after(function () {
		fake$.on.restore();
	});

	describe('after setup', function () {
		beforeEach(function () {
			onClientStart();
		});

		describe('when a touch press starts', function() {
			it('should register the touch event', function () {
				fake$.savedEvents().touchstart[0]({
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

				expect(getCurrentState().touches[0].id).toEqual(1);
				expect(getCurrentState().touches[0].force).toEqual(1);
			});

			it('should calculate the touch position', function () {
				fake$.savedEvents().touchstart[0]({
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

				expect(getCurrentState().touches[0].x).toEqual(-55);
				expect(getCurrentState().touches[0].y).toEqual(20);
			});

			it('should use the touch force if it is available', function () {
				fake$.savedEvents().touchstart[0]({
					touches: [{
						identifier: 1,
						clientY: 54,
						clientX: 45,
						target: {
							offsetLeft: 100,
							offsetTop: 34
						},
						force: 0.2,
						webkitForce: 0.5
					}]
				});

				expect(getCurrentState().touches[0].force).toEqual(0.2);
			});

			it('should use the webkit touch force if it is available', function () {
				fake$.savedEvents().touchstart[0]({
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

				expect(getCurrentState().touches[0].force).toEqual(0.5);
			});
		});

		describe('when a touch press moves', function() {
			beforeEach(function () {
				fake$.savedEvents().touchstart[0]({
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
			});

			it('should register the touch event', function() {
				fake$.savedEvents().touchmove[0]({
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

				expect(getCurrentState().touches[0].id).toEqual(1);
				expect(getCurrentState().touches[0].force).toEqual(1);
			});

			it('should calculate the touch position', function() {
				fake$.savedEvents().touchmove[0]({
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

				expect(getCurrentState().touches[0].x).toEqual(-55);
				expect(getCurrentState().touches[0].y).toEqual(20);
			});

			it('should use the touch force if it is available', function() {
				fake$.savedEvents().touchmove[0]({
					touches: [{
						identifier: 1,
						clientY: 54,
						clientX: 45,
						target: {
							offsetLeft: 100,
							offsetTop: 34
						},
						force: 0.2,
						webkitForce: 0.5
					}]
				});

				expect(getCurrentState().touches[0].force).toEqual(0.2);
			});

			it('should use the webkit touch force if it is available', function() {
				fake$.savedEvents().touchmove[0]({
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

				expect(getCurrentState().touches[0].force).toEqual(0.5);
			});
		});

		describe('when a touch press finishes', function() {
			beforeEach(function () {
				fake$.savedEvents().touchstart[0]({
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
			});

			describe('when the event has not been sent', function () {
				it('should send the event', function () {
					fake$.savedEvents().touchend[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					expect(getCurrentState().touches).toEqual([{
						force: 1,
						x: -55,
						y: 20,
						id: 1
					}]);
				});
			});

			describe('when the event has been sent at least once', function () {
				beforeEach(function () {
					getCurrentState();
				});

				it('should return the event on the next call', function () {
					fake$.savedEvents().touchend[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					expect(getCurrentState().touches).toEqual([{
						force: 1,
						x: -55,
						y: 20,
						id: 1
					}]);
				});

				it('should remove the event for subsequent calls', function () {
					fake$.savedEvents().touchend[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					getCurrentState();

					expect(getCurrentState().touches).toEqual([]);
				});
			});
		});

		describe('when a touch press leaves the touch area', function() {
			beforeEach(function () {
				fake$.savedEvents().touchstart[0]({
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
			});

			describe('when the event has not been sent', function () {
				it('should send the event', function () {
					fake$.savedEvents().touchleave[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					expect(getCurrentState().touches).toEqual([{
						force: 1,
						x: -55,
						y: 20,
						id: 1
					}]);
				});
			});

			describe('when the event has been sent at least once', function () {
				beforeEach(function () {
					getCurrentState();
				});

				it('should return the event on the next call', function () {
					fake$.savedEvents().touchleave[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					expect(getCurrentState().touches).toEqual([{
						force: 1,
						x: -55,
						y: 20,
						id: 1
					}]);
				});

				it('should remove the event for subsequent calls', function () {
					fake$.savedEvents().touchleave[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					getCurrentState();

					expect(getCurrentState().touches).toEqual([]);
				});
			});
		});

		describe('when a touch press is cancelled', function() {
			beforeEach(function () {
				fake$.savedEvents().touchstart[0]({
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
			});

			describe('when the event has not been sent', function () {
				it('should send the event', function () {
					fake$.savedEvents().touchcancel[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					expect(getCurrentState().touches).toEqual([{
						force: 1,
						x: -55,
						y: 20,
						id: 1
					}]);
				});
			});

			describe('when the event has been sent at least once', function () {
				beforeEach(function () {
					getCurrentState();
				});

				it('should return the event on the next call', function () {
					fake$.savedEvents().touchcancel[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					expect(getCurrentState().touches).toEqual([{
						force: 1,
						x: -55,
						y: 20,
						id: 1
					}]);
				});

				it('should remove the event for subsequent calls', function () {
					fake$.savedEvents().touchcancel[0]({
						changedTouches: [{
							identifier: 1,
						}]
					});

					getCurrentState();

					expect(getCurrentState().touches).toEqual([]);
				});
			});
		});
	});
});