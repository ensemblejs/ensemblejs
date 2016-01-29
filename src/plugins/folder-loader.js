'use strict';

let addTrailingSlash = require('../util/path').addTrailingSlash;
let normaliseRelativePath = require('../util/path').normaliseRelativePath;

let fs = require('fs');

function loadFromPath (pathToEntites, callback, prefix = 'Game') {
	let absolutePath = normaliseRelativePath(addTrailingSlash(pathToEntites));
	let exports = {};

	if (fs.existsSync(absolutePath)) {
		fs.readdirSync(absolutePath).forEach(function(file){
			if (file.substr(-3) !== '.js') {
				return;
			}

			const name = file.replace('.js', '');

			if (callback) {
				callback(require(absolutePath + file), prefix);
			} else {
				exports[name] = require(absolutePath + file);
			}
		});
	}

	return exports;
}

module.exports = {
	loadFromPath: loadFromPath
};