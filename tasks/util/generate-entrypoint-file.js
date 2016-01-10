'use strict';

var getRepoInfo = require('git-repo-info');
var fs = require('fs');
var path = require('path');
var paths = require('../paths');

function generateEntrypointFile (mode, done) {
  var filename = path.join(process.cwd(), paths.targets.build, mode) + '.js';

  var fromFile = fs.createReadStream(__dirname + '/default.entrypoint.js');
  var toFile = fs.createWriteStream(filename);

  fromFile.pipe(toFile, { end: false });
  fromFile.on('end', function() {
      toFile.write('\n');
      toFile.write('entryPoint.set("SaveMode", "' + mode + '");');
      toFile.write('entryPoint.set("Commit", "' + getRepoInfo().sha + '");');
      toFile.write('\n');
      toFile.end('entryPoint.run();');
      done();
  });
}

module.exports = generateEntrypointFile;