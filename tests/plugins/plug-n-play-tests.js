'use strict';

var expect = require('expect');
// var sinon = require('sinon');
var each = require('lodash').each;
var jsdom = require('jsdom').jsdom;

describe('the plugin manager', function() {
	var document = jsdom('<div id="a-div">With content.</div>');
	global.window = document.parentWindow;
	global.getComputedStyle = function() {};
	global.document = document;

	var myModule = {
		type: 'AlsoMine',
		func: function() {
			return 4;
		}
	};
	var myDep = {
		type: 'Dep',
		func: function () {
			return 3;
		}
	};
	var myModuleWithDep = {
		type: 'Mine',
		deps: ['Dep'],
		func: function(dep) {
			return dep();
		}
	};
	var myModuleReturnFunction = {
		type: 'RetFunction',
		func: function() {
			function retFunction () {
				return 54;
			}

			return retFunction;
		}
	};
	var myModuleReturnAnonymousFunction = {
		type: 'RetAnonymousFunction',
		func: function() {
			return function () {
				return 55;
			};
		}
	};
	var myModuleReturnsObject = {
		type: 'RetObject',
		func: function() {
			function f () {
				return 234;
			}

			return {
				value: 345345,
				f: f
			};
		}
	};
	var myModuleReturnModedFunction = {
		type: 'RetModedFunction',
		func: function() {
			return ['*', function () {
				return 57;
			}];
		}
	};

	var createAModuleToExecuteTest = function(deps, vaidationCode) {
		return {
			type: 'Test',
			deps: deps,
			func: vaidationCode
		};
	};
	var pluginManager;
	var logging = require('../support').logger;

	describe('using a plugin', function() {
		beforeEach(function () {
			pluginManager = require('../../src/plugins/plug-n-play').configure(logging, ['InputMode'], ['HasDefaultMode', 'InputMode', 'AlsoADefaultMode']);

			console.log(logging);
			logging.loaded.reset();
			logging.plugin.reset();
		});

		it('should a plugin being loaded', function () {
			pluginManager.load(myModuleReturnFunction);

			expect(logging.loaded.firstCall.args).toEqual(['ensemblejs::RetFunction']);
		});

		it('should report when a plugin\'s functions are executed', function () {
			pluginManager.load(myModuleReturnFunction);
			pluginManager.get('RetFunction')();
			expect(logging.plugin.firstCall.args[1]).toEqual('ensemblejs:RetFunction');
			expect(logging.plugin.firstCall.args[2]).toEqual('function retFunction() {\n\t\t\t\treturn 54;\n\t\t\t}');

			logging.plugin.reset();
			pluginManager.load(myModuleReturnsObject);
			pluginManager.get('RetObject').f();
			expect(logging.plugin.firstCall.args[1]).toEqual('ensemblejs:RetObject');
			expect(logging.plugin.firstCall.args[2]).toEqual('function f() {\n\t\t\t\treturn 234;\n\t\t\t}');

			logging.plugin.reset();
			pluginManager.load(myModuleReturnAnonymousFunction);
			pluginManager.get('RetAnonymousFunction')();
			expect(logging.plugin.firstCall.args[1]).toEqual('ensemblejs:RetAnonymousFunction');
			expect(logging.plugin.firstCall.args[2]).toEqual('function () {\n\t\t\t\treturn 55;\n\t\t\t}');

			logging.plugin.reset();
			pluginManager.load(myModuleReturnModedFunction);
			pluginManager.get('RetModedFunction')[1]();
			expect(logging.plugin.firstCall.args[1]).toEqual('ensemblejs:RetModedFunction');
			expect(logging.plugin.firstCall.args[2]).toEqual('function () {\n\t\t\t\treturn 57;\n\t\t\t}');
		});

		it('should have it\'s dependencies injected as parameters', function() {
			pluginManager.load(myDep);
			pluginManager.load(myModuleWithDep);

			pluginManager.load(createAModuleToExecuteTest(['Mine'], function(mine) {
				expect(mine()).toEqual(3);
			}));
		});

		it('should still work for modules without dependencies', function () {
			pluginManager.load(myModule);

			pluginManager.load(createAModuleToExecuteTest(['AlsoMine'], function(alsoMine) {
				expect(alsoMine()).toEqual(4);
			}));
		});

		it('should allow multiple plugins for specific plugin-types', function() {
			var inputMode = {
				type: 'InputMode',
				func: function() { return undefined; }
			};
			pluginManager.load(inputMode);
			pluginManager.load(inputMode);

			pluginManager.load(createAModuleToExecuteTest(['InputMode'], function(inputMode) {
				expect(inputMode().length).toEqual(2);
			}));
		});

		it('should default mode plugins for specific plugin-types', function() {
			var hasDefaultMode = {
				type: 'HasDefaultMode',
				func: function() { return 1; }
			};
			var hasCustomMode = {
				type: 'AlsoADefaultMode',
				func: function() { return ['my-mode', 3]; }
			};
			var noDefaultMode = {
				type: 'NoDefaultMode',
				func: function() { return 2; }
			};
			pluginManager.load(hasDefaultMode);
			pluginManager.load(hasCustomMode);
			pluginManager.load(noDefaultMode);

			pluginManager.load(createAModuleToExecuteTest(['HasDefaultMode', 'NoDefaultMode', 'AlsoADefaultMode'], function(hasDefaultModeDep, noDefaultModeDep, hasCustomModeDep) {
				expect(hasDefaultModeDep()[0]).toEqual(['*']);
				expect(hasDefaultModeDep()[1]).toEqual(1);
				expect(noDefaultModeDep()).toEqual(2);
				expect(hasCustomModeDep()[0]).toEqual(['my-mode']);
				expect(hasCustomModeDep()[1]).toEqual(3);
			}));
		});

		it('should default mode plugins that are also arrays', function() {
			var defaultModeArray = {
				type: 'InputMode',
				func: function() { return 1; }
			};
			pluginManager.load(defaultModeArray);

			pluginManager.load(createAModuleToExecuteTest(['InputMode'], function(defaultModeArray) {
				each(defaultModeArray(), function(dep) {
					expect(dep[0]).toEqual(['*']);
					expect(dep[1]).toEqual(1);
				});
			}));
		});

		it('should support custom-mode plugins that are also arrays', function() {
			var defaultModeArray = {
				type: 'InputMode',
				func: function() { return ['my-mode', 1]; }
			};
			pluginManager.load(defaultModeArray);

			pluginManager.load(createAModuleToExecuteTest(['InputMode'], function(defaultModeArray) {
				each(defaultModeArray(), function(dep) {
					expect(dep[0]).toEqual(['my-mode']);
					expect(dep[1]).toEqual(1);
				});
			}));
		});

		it('should support custom-mode plugins that apply to multiple game modes', function() {
			var defaultModeArray = {
				type: 'InputMode',
				func: function() { return [['my-mode', 'other-mode'], 1]; }
			};
			pluginManager.load(defaultModeArray);

			pluginManager.load(createAModuleToExecuteTest(['InputMode'], function(defaultModeArray) {
				each(defaultModeArray(), function(dep) {
					expect(dep[0]).toEqual(['my-mode', 'other-mode']);
					expect(dep[1]).toEqual(1);
				});
			}));
		});

		it('should not care if no default plugin types are supplied', function() {
			require('../src/plug-n-play').configure('name', 'version');
		});

		it('should defer all modules', function () {
			var loadedSecondNeededInFirst = {
				type: 'LaterDude',
				func: function() { return 'Holla'; }
			};
			var loadedFirstRequiresSecondDefine = {
				deps: ['LaterDude'],
				type: 'NowNowNow',
				func: function(laterDude, OkNow) {
					return {
						LaterDude: function () { return laterDude(); },
						OkNow: OkNow
					};
				}
			};

			pluginManager.load(loadedFirstRequiresSecondDefine);
			pluginManager.load(loadedSecondNeededInFirst);

			pluginManager.load(createAModuleToExecuteTest(['NowNowNow'], function(nowNowNow) {
				expect(nowNowNow().LaterDude).toNotEqual('Holla');
				expect(nowNowNow().LaterDude()).toEqual('Holla');
			}));
		});

		it('should work for the seeded logger', function () {
			pluginManager.load(createAModuleToExecuteTest(['Logger'], function(logger) {
				expect(logger()).toEqual(logging);
			}));
		});

		it('should raise an exception if a dependency is used during the load phase', function () {
			var now = {
				deps: ['OkNow'],
				type: 'NowNowNow',
				func: function(okNow) {
					return okNow();
				}
			};

			try {
				pluginManager.load(now);
			} catch (e) {
				expect(true).toBe(true);
				return;
			}

			expect(true).toBe(false);
		});

		it('should raise an exception if the dependency is not defined', function () {
			try {
				pluginManager.load(createAModuleToExecuteTest(['NotDefined'], function(PM) {
					expect(PM).toEqual(pluginManager);
				}));
			} catch (e) {
				expect(true).toBe(true);
				return;
			}

			expect(true).toBe(false);
		});

		it('should raise an exception if any arguments are passed into a dependency', function () {
			try {
				var loadedFirstRequiresSecondDefine = {
					type: 'NowNowNow',
					func: function() {
						return function (value) {
							return value + 1;
						};
					}
				};

				pluginManager.load(loadedFirstRequiresSecondDefine);
				pluginManager.load(createAModuleToExecuteTest(['NowNowNow'], function(nowNowNow) {
					nowNowNow(1);
				}));
			} catch (e) {
				expect(true).toBe(true);
				return;
			}

			expect(true).toBe(false);
		});
	});

	describe('getting a plugin', function() {
		it('should return the plugin set by the developer', function() {
			expect(pluginManager.get('AlsoMine')).toEqual(4);
		});
	});

	describe('setting a property', function() {
		it('should set the property', function() {
			pluginManager.set('P', 1);

			pluginManager.load(createAModuleToExecuteTest(['P'], function(p) {
				expect(p()).toEqual(1);
			}));
		});
	});

	describe('DefinePlugin', function () {
		it('allows you to define a plugin within the plugin system', function() {
			pluginManager.load(createAModuleToExecuteTest(['DefinePlugin'], function(definePlugin) {
				definePlugin()('RunTimeDefinedPlugin', function() { return 44; });
				expect(pluginManager.get('RunTimeDefinedPlugin')).toEqual(44);
			}));
		});
	});
});