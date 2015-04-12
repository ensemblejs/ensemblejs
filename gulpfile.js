'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var rename = require('gulp-rename');
var del = require('del');
var scsslint = require('gulp-scss-lint');
var flatten = require('gulp-flatten');
var plumber = require('gulp-plumber');
var istanbul = require('gulp-istanbul');
var coveralls = require('gulp-coveralls');

var paths = {
  js: ['ensemble.js', 'src/**/*.js'],
  scss: ['src/scss/**/*.scss'],
  cssSrc: ['src/css/**/*.css'],
  css: ['public/css/*.css'],
  tests: ['tests/**/*.js']
};

var onError = function (error) {
    console.log(error);
    this.emit('end');
    throw error;
};

gulp.task('delete-gen-css', function (cb) {
    del(paths.css, cb);
});
gulp.task('clean', ['delete-gen-css']);

gulp.task('lint-code', function () {
    gulp.src(paths.js)
        .pipe(plumber({errorHandler: onError}))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});
gulp.task('lint-scss', function () {
    return gulp.src(paths.scss)
        .pipe(plumber({errorHandler: onError}))
        .pipe(scsslint({ 'bundleExec': true }));
});
gulp.task('lint', ['lint-code', 'lint-scss']);

gulp.task('test', ['clean'], function (cb) {
    gulp.src(paths.js)
        .pipe(plumber({errorHandler: onError}))
        .pipe(istanbul())
        .pipe(istanbul.hookRequire())
        .on('finish', function () {
            gulp.src(paths.tests)
                .pipe(mocha({reporter: 'spec'}))
                .pipe(istanbul.writeReports())
                .on('end', cb);
        });
});

gulp.task('coveralls', ['test'], function() {
  return gulp.src(['coverage/**/lcov.info'])
    .pipe(coveralls());
});

gulp.task('build-styles', function() {
    return gulp.src(paths.scss)
        .pipe(plumber({errorHandler: onError}))
        .pipe(autoprefixer({ cascade: false }))
        .pipe(sass({ style: 'expanded', sourcemapPath: 'public/css', bundleExec: true }))
        .pipe(rename({suffix: '.min'}))
        .pipe(minifycss())
        .pipe(flatten())
        .pipe(gulp.dest('public/css'));
});
gulp.task('copy-css', function () {
    return gulp.src(paths.cssSrc)
       .pipe(plumber({errorHandler: onError}))
       .pipe(gulp.dest('public/css'));
});
gulp.task('build', ['build-styles', 'copy-css']);

gulp.task('default', ['lint', 'test', 'build']);