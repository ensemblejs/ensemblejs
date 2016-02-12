'use strict';

var mocha = require('gulp-mocha');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var coveralls = require('gulp-coveralls');
var isparta = require('isparta');
var plumber = require('gulp-plumber');
var gulpSequence = require('gulp-sequence');

var paths = require('./paths');
var onError = require('./util/error');

function addTasks (gulp) {
  require('./cleanup')(gulp);

  gulp.task('framework:run-tests', function (cb) {
    gulp.src(paths.framework.coveragejs)
      .pipe(plumber({errorHandler: onError}))
      .pipe(istanbul({
        instrumenter: isparta.Instrumenter,
        includeUntested: true
      }))
      .pipe(istanbul.hookRequire())
      .on('finish', function () {
          gulp.src(paths.framework.tests, {read: false})
            .pipe(mocha({ reporter: 'spec' }))
            .pipe(istanbul.writeReports({
              reporters: ['json-summary', 'text', 'lcov', 'text-summary']
            }))
            .on('end', cb);
      });
  });

  gulp.task('framework:coveralls', ['framework:test'], function() {
    return gulp.src(paths.framework.coverageinfo).pipe(coveralls());
  });

  gulp.task('framework:test', gulpSequence(
    'db:start', 'framework:run-tests', 'db:stop')
  );
}

module.exports = addTasks;