'use strict';

var jshint = require('gulp-jshint');
var scsslint = require('gulp-scss-lint');
var plumber = require('gulp-plumber');

var paths = require('./paths');
var onError = require('./util/error');

function addTasks (gulp) {

  gulp.task('framework:lint-code', function () {
    gulp.src(paths.framework.js)
      .pipe(plumber({errorHandler: onError}))
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'));
  });

  gulp.task('framework:lint-scss', function () {
    return gulp.src(paths.framework.scss)
      .pipe(plumber({errorHandler: onError}))
      .pipe(scsslint({bundleExec: true }));
  });

  gulp.task('framework:lint', ['framework:lint-code', 'framework:lint-scss']);
}

module.exports = addTasks;