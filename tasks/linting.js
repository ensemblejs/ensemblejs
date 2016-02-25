'use strict';

var jshint = require('gulp-jshint');
var plumber = require('gulp-plumber');
var less = require('gulp-less');
var csslint = require('gulp-csslint');
var sourcemaps = require('gulp-sourcemaps');

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

  gulp.task('framework:lint-less', function () {
    return gulp.src(paths.framework.less)
      .pipe(plumber({errorHandler: onError}))
      .pipe(sourcemaps.init())
      .pipe(less())
      .pipe(csslint())
      .pipe(csslint.reporter('compact'));
  });

  gulp.task('framework:lint', ['framework:lint-code', 'framework:lint-less']);
}

module.exports = addTasks;