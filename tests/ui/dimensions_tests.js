'use strict';

var expect = require('expect');
var window = {
	innerWidth: 1000,
	innerHeight: 400
};

var defer = function(x) {
	return function() {
		return x;
	};
};

var dimensions = require('../../src/ui/dimensions').func(defer(2.6), defer(32), defer(window)).get;

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
});