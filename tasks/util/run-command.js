'use strict';

var exec = require('child_process').exec;

function runCommand (command) {
  exec(command, function (err, stdout, stderr) {
    console.log(stdout);
    console.error(stderr);
    if (err !== null) {
      console.error('exec error: ' + err);
    }
  });
}

module.exports = runCommand;