'use strict';

/* eslint-disable no-magic-numbers */

import expect from 'expect';
import {defer} from '../support';

describe('dimensions', () => {
	describe('when the aspect ratio is greater than 1', () => {
		describe('when the minimum margin is less than the margin', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 32
				}
			};

			describe('when the screen is taller than it is wide', function () {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 1000};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(1000);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(384.5);
				});
			});

			describe('screen is wider than it is tall, less than aspect', () => {
				let dimensions;
				const window = {innerWidth: 1000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(1000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(1000);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(385);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(107.5);
				});
			});

			describe('screen is wider than it is tall, more than aspect', () => {
				let dimensions;
				const window = {innerWidth: 2000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(2000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should reduce usable width to meet the aspect ratio', () => {
					expect(dimensions().usableWidth).toBe(1560);
				});

				it('should set the usable height', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(220);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('when the width equals the height', () => {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(184.5);
				});
			});
		});

		describe('when the minimum margin has to be enforced', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 200
				}
			};
			let dimensions;
			const window = {innerWidth: 600, innerHeight: 630};

			beforeEach(function () {
				dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
			});

			it('should set the screen dimensions', () => {
				expect(dimensions().screenWidth).toBe(600);
				expect(dimensions().screenHeight).toBe(630);
			});

			it('should determine orientation correctly', () => {
				expect(dimensions().orientation).toBe('portrait');
			});

			it('should set usable width to the screen width', () => {
				expect(dimensions().usableWidth).toBe(600);
			});

			it('should reduce usable height to maintain the aspect ratio', () => {
				expect(dimensions().usableHeight).toBe(77);
			});

			it('should calculate the margin', () => {
				expect(dimensions().margins.x).toBe(0);
				expect(dimensions().margins.y).toBe(276.5);
			});
		});

		describe('when the minimum margin is zero', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 0
				}
			};

			describe('when the screen is taller than it is wide', function () {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 1000};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(1000);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(384.5);
				});
			});

			describe('screen is wider than it is tall, less than aspect', () => {
				let dimensions;
				const window = {innerWidth: 1000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(1000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(1000);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(385);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(107.5);
				});
			});

			describe('screen is wider than it is tall, more than aspect', () => {
				let dimensions;
				const window = {innerWidth: 2000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(2000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should reduce usable width to meet the aspect ratio', () => {
					expect(dimensions().usableWidth).toBe(1560);
				});

				it('should set the usable height', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(220);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('when the width equals the height', () => {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(184.5);
				});
			});
		});
	});

	describe('when the aspect ratio is 1', () => {
		describe('when the minimum margin is less than the margin', () => {
			const config = {
				client: {
					aspectRatio: 1,
					widescreenMinimumMargin: 32
				}
			};

			describe('when the screen is taller than it is wide', function () {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 1000};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(1000);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(200);
				});
			});

			describe('screen is wider than it is tall, less than aspect', () => {
				let dimensions;
				const window = {innerWidth: 1000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(1000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(200);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('screen is wider than it is tall, more than aspect', () => {
				let dimensions;
				const window = {innerWidth: 2000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(2000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should reduce usable width to meet the aspect ratio', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should set the usable height', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(700);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('when the width equals the height', () => {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('square');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(536);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(536);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(32);
					expect(dimensions().margins.y).toBe(32);
				});
			});
		});

		describe('when the minimum margin has to be enforced', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 200
				}
			};
			let dimensions;
			const window = {innerWidth: 600, innerHeight: 630};

			beforeEach(function () {
				dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
			});

			it('should set the screen dimensions', () => {
				expect(dimensions().screenWidth).toBe(600);
				expect(dimensions().screenHeight).toBe(630);
			});

			it('should determine orientation correctly', () => {
				expect(dimensions().orientation).toBe('portrait');
			});

			it('should set usable width to the screen width', () => {
				expect(dimensions().usableWidth).toBe(600);
			});

			it('should reduce usable height to maintain the aspect ratio', () => {
				expect(dimensions().usableHeight).toBe(77);
			});

			it('should calculate the margin', () => {
				expect(dimensions().margins.x).toBe(0);
				expect(dimensions().margins.y).toBe(276.5);
			});
		});

		describe('when the minimum margin is zero', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 0
				}
			};

			describe('when the screen is taller than it is wide', function () {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 1000};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(1000);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(384.5);
				});
			});

			describe('screen is wider than it is tall, less than aspect', () => {
				let dimensions;
				const window = {innerWidth: 1000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(1000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(1000);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(385);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(107.5);
				});
			});

			describe('screen is wider than it is tall, more than aspect', () => {
				let dimensions;
				const window = {innerWidth: 2000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(2000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should reduce usable width to meet the aspect ratio', () => {
					expect(dimensions().usableWidth).toBe(1560);
				});

				it('should set the usable height', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(220);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('when the width equals the height', () => {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(184.5);
				});
			});
		});
	});

	describe('when the aspect ratio is less than 1', () => {
		describe('when the minimum margin is less than the margin', () => {
			const config = {
				client: {
					aspectRatio: 0.38,
					widescreenMinimumMargin: 32
				}
			};

			describe('when the screen is taller than it is wide', function () {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 1000};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(1000);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(380);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(1000);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(110);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('screen is wider than it is tall, less than aspect', () => {
				let dimensions;
				const window = {innerWidth: 1000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(1000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(228);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(386);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('screen is wider than it is tall, more than aspect', () => {
				let dimensions;
				const window = {innerWidth: 2000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(2000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should reduce usable width to meet the aspect ratio', () => {
					expect(dimensions().usableWidth).toBe(228);
				});

				it('should set the usable height', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(886);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('when the width equals the height', () => {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(228);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(186);
					expect(dimensions().margins.y).toBe(0);
				});
			});
		});

		describe('when the minimum margin has to be enforced', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 200
				}
			};
			let dimensions;
			const window = {innerWidth: 600, innerHeight: 630};

			beforeEach(function () {
				dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
			});

			it('should set the screen dimensions', () => {
				expect(dimensions().screenWidth).toBe(600);
				expect(dimensions().screenHeight).toBe(630);
			});

			it('should determine orientation correctly', () => {
				expect(dimensions().orientation).toBe('portrait');
			});

			it('should set usable width to the screen width', () => {
				expect(dimensions().usableWidth).toBe(600);
			});

			it('should reduce usable height to maintain the aspect ratio', () => {
				expect(dimensions().usableHeight).toBe(77);
			});

			it('should calculate the margin', () => {
				expect(dimensions().margins.x).toBe(0);
				expect(dimensions().margins.y).toBe(276.5);
			});
		});

		describe('when the minimum margin is zero', () => {
			const config = {
				client: {
					aspectRatio: 2.6,
					widescreenMinimumMargin: 0
				}
			};

			describe('when the screen is taller than it is wide', function () {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 1000};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(1000);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(384.5);
				});
			});

			describe('screen is wider than it is tall, less than aspect', () => {
				let dimensions;
				const window = {innerWidth: 1000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(1000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(1000);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(385);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(107.5);
				});
			});

			describe('screen is wider than it is tall, more than aspect', () => {
				let dimensions;
				const window = {innerWidth: 2000, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(2000);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('landscape');
				});

				it('should reduce usable width to meet the aspect ratio', () => {
					expect(dimensions().usableWidth).toBe(1560);
				});

				it('should set the usable height', () => {
					expect(dimensions().usableHeight).toBe(600);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(220);
					expect(dimensions().margins.y).toBe(0);
				});
			});

			describe('when the width equals the height', () => {
				let dimensions;
				const window = {innerWidth: 600, innerHeight: 600};

				beforeEach(function () {
					dimensions = require('../../src/ui/dimensions').func(defer(config), defer(window)).get;
				});

				it('should set the screen dimensions', () => {
					expect(dimensions().screenWidth).toBe(600);
					expect(dimensions().screenHeight).toBe(600);
				});

				it('should determine orientation correctly', () => {
					expect(dimensions().orientation).toBe('portrait');
				});

				it('should set usable width to the screen width', () => {
					expect(dimensions().usableWidth).toBe(600);
				});

				it('should reduce usable height to maintain the aspect ratio', () => {
					expect(dimensions().usableHeight).toBe(231);
				});

				it('should calculate the margin', () => {
					expect(dimensions().margins.x).toBe(0);
					expect(dimensions().margins.y).toBe(184.5);
				});
			});
		});
	});

	describe('when the aspect ratio is "device"', () => {
		let dimensions;
		const window = {innerWidth: 1000, innerHeight: 400};

		beforeEach(function () {
			dimensions = require('../../src/ui/dimensions').func(defer({
				client: {
					aspectRatio: 'device',
					widescreenMinimumMargin: 0
				}
			}), defer(window)).get;
		});

		it('should use the device aspect ratio', function () {


			expect(dimensions().usableWidth).toBe(1000);
			expect(dimensions().usableHeight).toBe(400);
			expect(dimensions().ratio).toBe(2.5);
		});
	});
});