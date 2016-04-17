'use strict';

var expect = require('expect');
var window = {
	innerWidth: 1000,
	innerHeight: 400
};

var config = {
	client: {
		aspectRatio: 2.6,
		widescreenMinimumMargin: 32
	}
};

var defer = require('../support').defer;

var dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;

describe('dimensions', function() {
	it('should get the screen width', function() {
		expect(dimensions().screenWidth).toBe(1000);
	});

	it('should get the screen height', function() {
		expect(dimensions().screenHeight).toBe(400);
	});

	it('should determine orientation correctly', function() {
		expect(dimensions().orientation).toBe('portrait');
	});

	it('should calculate the maximum usable height and width to create a space that will fit preserving aspect ration', function() {
		expect(dimensions().usableWidth).toBe(1040);
		expect(dimensions().usableHeight).toBe(336);
	});

	it('should use the device aspect ratio when instructed', function () {
		var dimensions = require('../../src/ui/dimensions').func(defer({
			client: {
				aspectRatio: 'device',
				widescreenMinimumMargin: 0
			}
		}), defer(window)).get;

		expect(dimensions().usableWidth).toBe(1000);
		expect(dimensions().usableHeight).toBe(400);
		expect(dimensions().ratio).toBe(2.5);
	});
});