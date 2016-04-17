'use strict';

var getRepoInfo = require('git-repo-info');
var fs = require('fs');
var path = require('path');
var paths = require('../paths');

function sha () {
  return process.env.COMMIT_SHA || getRepoInfo().sha;
}

function generateEntrypointFile (saveMode, done) {
  var name = path.join(process.cwd(), paths.targets.build, saveMode) + '.js';

  var fromFile = fs.createReadStream(__dirname + '/default.entrypoint.js');
  var toFile = fs.createWriteStream(name);

  fromFile.pipe(toFile, { end: false });
  fromFile.on('end', function() {
    toFile.write('\n');
    toFile.write(`set("SaveMode", "${saveMode}");`);
    toFile.write(`set("Commit", "${sha()}");`);
    toFile.write('\n');
    toFile.end('run();');
    done();
  });
}

module.exports = generateEntrypointFile;