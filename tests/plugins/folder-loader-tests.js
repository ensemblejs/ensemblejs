'use strict';

var expect = require('expect');
var async = require('async');
var entityLoader = require('src/plugins/folder-loader.js');
var mkdir = require('fs').mkdir;
var rmdir = require('fs').rmdir;
var writeFile = require('fs').writeFile;
var unlink = require('fs').unlink;

describe('given an empty path', function(){
	beforeEach(function(done) {
		mkdir(__dirname + '/empty', done);
	});

	afterEach(function(done) {
		rmdir(__dirname + '/empty', done);
	});

	it('should return an empty hash', function(){
		expect(entityLoader.loadFromPath('../../tests/plugins/empty')).toEqual({});
	});
});

describe('given a path with entities in it', function(){
	beforeEach(function(done) {
    async.series([
      function (step) { mkdir(__dirname + '/folder', step); },
      function (step) { writeFile(__dirname + '/folder/one.js', 'module.exports = {herp: "derp"}; ', step); },
      function (step) { writeFile(__dirname + '/folder/two.js', 'module.exports = function() { return "derp" };', step); },
      function (step) { writeFile(__dirname + '/folder/one.js.ignored', 'The quick brown fox jumps over the lazy dog.', step); }
    ], done);
	});

	afterEach(function(done) {
    async.series([
  		function (step) { unlink(__dirname + '/folder/one.js', step); },
  		function (step) { unlink(__dirname + '/folder/two.js', step); },
  		function (step) { unlink(__dirname + '/folder/one.js.ignored', step); },
  		function (step) { rmdir(__dirname + '/folder', step); }
    ], done);
	});

	it('should load each into the hash', function() {
		var entities = entityLoader.loadFromPath('../../tests/plugins/folder');
		expect(entities.one).toEqual({herp: 'derp'});
		expect(entities.two()).toEqual('derp');
	});

	it('should ignore files that don\'t end in .js', function() {
		expect(entityLoader.loadFromPath('../../tests/plugins/folder/')['one.js.ignored']).toBe(undefined);
	});
});

describe('given an absolute path', function() {
  beforeEach(function(done) {
    async.series([
      function (step) { mkdir(__dirname + '/folder', step); },
      function (step) { writeFile(__dirname + '/folder/one.js', 'module.exports = {herp: "derp"}; ', step); }
    ], done);
  });

  afterEach(function(done) {
    async.series([
      function (step) { unlink(__dirname + '/folder/one.js', step); },
      function (step) { rmdir(__dirname + '/folder', step); }
    ], done);
  });

  it('should load each into the hash', function() {
    var entities = entityLoader.loadFromPath(__dirname + '/folder');
    expect(entities.one).toEqual({herp: 'derp'});
  });
});