'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var createFakeDom = require('../../fake/dom');

var fake$ = require('../../fake/jquery').$;
var fake$wrapper = require('../../fake/jquery').fakeWith(fake$);

var sut;
var onClientStart;

describe('the mouse input capture plugin', function () {
	var mouse;

	before(function () {
		sinon.spy(fake$, 'on');
	});

	beforeEach(function (done) {
		var html = '<html><body><canvas id="element"></canvas></body></html>';

		createFakeDom(html, function (window) {
	  	sut = makeTestible('input/client/mouse', {
				Window: window,
				Config: {
					client: {
						element: 'element'
					}
				},
				$: fake$wrapper,
				DeviceMode: 'primary'
			});
			mouse = sut[0];
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

		describe('when the mouse moves', function() {
			it('should update the current x and y values', function () {
		    fake$.savedEvents().mousemove[0]({
					layerX: 45,
					layerY: 67
				});

				expect(mouse().mouse.x).toEqual(45);
				expect(mouse().mouse.y).toEqual(67);
			});
		});

		describe('when a mouse button is clicked', function() {
			it('should register the key as a single press key', function () {
				fake$.savedEvents().click[0]({which: 1 });

				expect(mouse().singlePressKeys).toEqual([{key: 'primary', modifiers: []}]);
			});

			it('should remove the single press key after get the current state', function () {
				fake$.savedEvents().click[0]({which: 1});

				expect(mouse().singlePressKeys).toEqual([{key: 'primary', modifiers: []}]);
				expect(mouse().singlePressKeys).toEqual([]);
			});
		});

		describe('when a mouse button is pressed', function() {
			it('should register the mouse click as a key', function () {
				fake$.savedEvents().mousedown[0]({which: 1, preventDefault: sinon.spy() });

				expect(mouse().keys).toEqual([{key: 'primary', modifiers: []}]);
			});

			it('should continue to register the mouse click on subsequent calls to getCurrentState', function () {
				fake$.savedEvents().mousedown[0]({which: 1, preventDefault: sinon.spy() });

				expect(mouse().keys).toEqual([{key: 'primary', modifiers: []}]);
				expect(mouse().keys).toEqual([{key: 'primary', modifiers: []}]);
			});
		});

		describe('when a mouse button is released', function() {
			it('should remove the mouse click from the current state', function () {
				fake$.savedEvents().mousedown[0]({
					which: 1,
					preventDefault: sinon.spy()
				});
				fake$.savedEvents().mouseup[0]({
					which: 1,
					preventDefault: sinon.spy()
				});

				expect(mouse().keys).toNotEqual([{key: 'primary', modifiers: []}]);
			});
		});
	});
});