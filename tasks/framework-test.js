'use strict';

var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var coveralls = require('gulp-coveralls');
var isparta = require('isparta');
var plumber = require('gulp-plumber');
var gulpSequence = require('gulp-sequence');

var paths = require('./paths');
var onError = require('./util/error');

function runTestsInPath (gulp, path, scope, cb) {
  gulp.src(paths.framework.coveragejs)
    .pipe(plumber({errorHandler: onError}))
    .pipe(istanbul({
      instrumenter: isparta.Instrumenter,
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire())
    .on('finish', function () {
        gulp.src(path, {read: false})
          .pipe(mocha({ reporter: 'spec', timeout: 10000 }))
          .pipe(istanbul.writeReports({
            dir: './coverage/' + scope,
            reporters: ['json-summary', 'text', 'lcov', 'text-summary']
          }))
          .on('end', cb);
    });
}

function runTestsWithoutInstrumentation (gulp, path) {
  return gulp.src(path, {read: false})
    .pipe(plumber({errorHandler: onError}))
    .pipe(mocha({ reporter: 'spec', timeout: 10000 }));
}

function addTasks (gulp) {
  require('./cleanup')(gulp);

  gulp.task('framework:run-unit-tests', function (cb) {
    return runTestsInPath(gulp, paths.framework.unitTests, 'unit', cb);
  });

  gulp.task('framework:run-integration-tests', function (cb) {
    return runTestsInPath(gulp, paths.framework.integrationTests, 'int', cb);
  });

  gulp.task('framework:run-performance-tests', function () {
    return runTestsWithoutInstrumentation(gulp, paths.framework.performanceTests);
  });

  gulp.task('framework:run-all-tests', function (cb) {
    return runTestsInPath(gulp, paths.framework.allTests, 'all', cb);
  });

  gulp.task('framework:coveralls', ['framework:test'], function() {
    return gulp.src(paths.framework.coverageinfo).pipe(coveralls());
  });

  gulp.task('framework:test:unit', ['framework:run-unit-tests']);

  gulp.task('framework:test:perf', ['framework:run-perf-tests']);

  gulp.task('framework:test:integration', gulpSequence(
    'db:start', 'framework:run-integration-tests', 'db:stop')
  );

  gulp.task('framework:test:perf', ['framework:run-performance-tests']);

  gulp.task('framework:test', gulpSequence('db:start', 'framework:run-all-tests', 'db:stop'));
}

module.exports = addTasks;