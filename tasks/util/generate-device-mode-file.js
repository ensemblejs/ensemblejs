'use strict';

var fs = require('fs');
var path = require('path');
var paths = require('../paths');

function generateDeviceModeFile (deviceMode, done) {
  var name = path.join(process.cwd(), paths.targets.distJs, deviceMode) + '.js';

  var fromFile = fs.createReadStream(__dirname + '/default.device-mode.js');
  var toFile = fs.createWriteStream(name);

  fromFile.pipe(toFile, { end: false });
  fromFile.on('end', function() {
    toFile.write('\n');
    toFile.write(`var deviceMode = '${deviceMode}';`);
    done();
  });
}

module.exports = generateDeviceModeFile;