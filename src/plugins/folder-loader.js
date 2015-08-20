'use strict';

function addTrailingSlash (path) {
	return path.substr(-1) === '/' ? path : path + '/';
}

function normaliseRelativePath (path) {
	return path.substr(0, 1) === '/' ? path : require('path').join(__dirname, path);
}

function loadFromPath (pathToEntites, callback) {
	var absolutePath = normaliseRelativePath(addTrailingSlash(pathToEntites));

	var exports = {};

	require('fs').readdirSync(absolutePath).forEach(function(file){
		if (file.substr(-3) !== '.js') {
			return;
		}

		var name = file.replace('.js', '');

		if (callback) {
			callback(require(absolutePath + file), 'Game');
		} else {
			exports[name] = require(absolutePath + file);
		}
	});

	return exports;
}

module.exports = {
	loadFromPath: loadFromPath
};