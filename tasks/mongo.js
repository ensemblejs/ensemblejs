'use strict';

var del = require('del');
var mkdirp = require('mkdirp');
var runCommand = require('./util/run-command');

function addTasks (gulp) {
  gulp.task('mongo:start', function() {
    mkdirp('data/db');
    mkdirp('data/logs');
    runCommand('mongod --fork --dbpath data/db --logpath data/logs/mongo.log');
  });

  gulp.task('mongo:stop', function() {
    runCommand('mongo admin --eval "db.shutdownServer();"');
  });

  gulp.task('mongo:reset', function(done) {
    del('data/db', function () {
      del('data/logs', done);
    });
  });
}

module.exports = addTasks;