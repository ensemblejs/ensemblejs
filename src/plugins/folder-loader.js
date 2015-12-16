'use strict';

var addTrailingSlash = require('../util/path').addTrailingSlash;
var normaliseRelativePath = require('../util/path').normaliseRelativePath;

function loadFromPath (pathToEntites, callback, prefix) {
	prefix = prefix || 'Game';
	var absolutePath = normaliseRelativePath(addTrailingSlash(pathToEntites));

	var exports = {};

	require('fs').readdirSync(absolutePath).forEach(function(file){
		if (file.substr(-3) !== '.js') {
			return;
		}

		var name = file.replace('.js', '');

		if (callback) {
			callback(require(absolutePath + file), prefix);
		} else {
			exports[name] = require(absolutePath + file);
		}
	});

	return exports;
}

module.exports = {
	loadFromPath: loadFromPath
};