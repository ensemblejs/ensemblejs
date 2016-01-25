'use strict';

var spawn = require('child_process').spawn;
var nsp = require('gulp-nsp');
var paths = require('./paths');
var gutil = require('gulp-util');

function addTasks (gulp) {
  gulp.task('nsp', function (done) {
    nsp({package: __dirname + '/../package.json'}, done);
  });

  gulp.task('retire', function() {
    var child = spawn('retire', ['--ignore', paths.retirePathsToIgnore, '--nocache'], {cwd: process.cwd()});

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', gutil.log);

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function (data) {
        gutil.log(gutil.colors.red(data));
    });
  });

  gulp.task('vuln', ['nsp', 'retire']);
}


module.exports = addTasks;