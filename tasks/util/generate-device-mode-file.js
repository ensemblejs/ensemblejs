'use strict';

const fs = require('fs');
const path = require('path');
const paths = require('../paths');
const defaultDeviceConfig = require('../../config/device-mode-defaults');

function generateDeviceModeFile (deviceMode, done) {
  const deviceConfig = Object.assign({}, defaultDeviceConfig, deviceMode);

  const filename = `${path.join(process.cwd(), paths.targets.distJs, deviceConfig.name)}.js`;

  const fromFile = fs.createReadStream(`${__dirname}/default.device-mode.js`);
  const toFile = fs.createWriteStream(filename);

  fromFile.pipe(toFile, { end: false });
  fromFile.on('end', function() {
    toFile.write('\n');
    toFile.write(`var deviceMode = ${JSON.stringify(deviceConfig)};`);
    done();
  });
}

module.exports = generateDeviceModeFile;