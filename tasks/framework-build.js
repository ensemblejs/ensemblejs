'use strict';

var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var flatten = require('gulp-flatten');
var plumber = require('gulp-plumber');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var rename = require('gulp-rename');
var flatten = require('gulp-flatten');
var plumber = require('gulp-plumber');
var less = require('gulp-less');
var sourcemaps = require('gulp-sourcemaps');

var paths = require('./paths');
var runCommand = require('./util/run-command');
var onError = require('./util/error');

function addTasks (gulp) {
  gulp.task('framework:build-styles', function() {
    return gulp.src(paths.framework.less)
      .pipe(plumber({errorHandler: onError}))
      .pipe(sourcemaps.init())
      .pipe(less())
      .pipe(autoprefixer({ cascade: false }))
      .pipe(rename({suffix: '.min'}))
      .pipe(cleanCSS())
      .pipe(flatten())
      .pipe(gulp.dest('public/css'));
  });

  gulp.task('framework:copy-css', function () {
    return gulp.src(paths.framework.cssSrc)
      .pipe(plumber({errorHandler: onError}))
      .pipe(gulp.dest('public/css'));
  });

  gulp.task('framework:copy-vendor-js', function () {
    return gulp.src(paths.framework.jsToCopy)
      .pipe(plumber({errorHandler: onError}))
      .pipe(gulp.dest('public/js/3rd-party'));
  });

  gulp.task('framework:modernizr', function () {
    return runCommand('modernizr -u -c config/modernizr-config.json -d public/js/3rd-party/');
  });

  gulp.task('framework:build', [
    'framework:build-styles',
    'framework:copy-css',
    'framework:modernizr',
    'framework:copy-vendor-js'
  ]);
}

module.exports = addTasks;