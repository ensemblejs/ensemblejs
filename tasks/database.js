'use strict';

var runCommand = require('./util/run-command');

function addTasks (gulp) {
  gulp.task('db:start', function() {
    runCommand('couchdb -b');
  });

  gulp.task('db:stop', function() {
    runCommand('couchdb -d');
  });

  gulp.task('db:reset', function() {
  });
}

module.exports = addTasks;