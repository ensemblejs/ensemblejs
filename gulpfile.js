'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var rename = require('gulp-rename');
var del = require('del');
var scsslint = require('gulp-scss-lint');
var flatten = require('gulp-flatten');
var plumber = require('gulp-plumber');
var istanbul = require('gulp-istanbul');
var coveralls = require('gulp-coveralls');
var nsp = require('gulp-nsp');
var spawn = require('child_process').spawn;
var gutil = require('gulp-util');
var exec = require('child_process').exec;
var mkdirp = require('mkdirp');

var runCommand = function(command) {
  exec(command, function (err, stdout, stderr) {
    console.log(stdout);
    console.error(stderr);
    if (err !== null) {
      console.error('exec error: ' + err);
    }
  });
};

var paths = {
  js: ['ensemble.js', 'src/**/*.js'],
  coveragejs: ['ensemble.js', 'src/**/*.js', '!src/debug/**/*.js', '!src/metrics/**/*.js', '!src/logging/**/*.js'],
  scss: ['src/scss/**/*.scss'],
  cssSrc: ['src/css/**/*.css'],
  deleteOnClean: ['public/css/*.css', 'data/db', 'data/logs'],
  tests: ['tests/*.js', 'tests/**/*.js'],
  jsToCopy: [
    'node_modules/clipboard/dist/clipboard.min.js',
    'bower_components/qrcode.js/qrcode.js'
  ],
  retirePathsToIgnore: [
    'node_modules/browserify/node_modules/insert-module-globals/node_modules/lexical-scope/bench'
  ]
};

var onError = function (error) {
    console.log(error);
    this.emit('end');
    throw error;
};

gulp.task('delete-paths', function (cb) {
    del(paths.deleteOnClean, cb);
});

gulp.task('clean', ['delete-paths']);

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

gulp.task('test', function (cb) {
    gulp.src(paths.coveragejs)
        .pipe(plumber({errorHandler: onError}))
        .pipe(istanbul({includeUntested: true}))
        .pipe(istanbul.hookRequire())
        .on('finish', function () {
            gulp.src(paths.tests)
                .pipe(mocha({reporter: 'spec'}))
                .pipe(istanbul.writeReports({reporters: ['json-summary', 'text', 'lcov', 'text-summary']}))
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
gulp.task('copy-vendor-js', function () {
    return gulp.src(paths.jsToCopy)
       .pipe(plumber({errorHandler: onError}))
       .pipe(gulp.dest('public/js/3rd-party'));
});
gulp.task('build', ['build-styles', 'copy-css', 'copy-vendor-js']);

gulp.task('watch', function () {
  gulp.watch(paths.scss, ['build']);
});

gulp.task('mongo-start', function() {
  mkdirp('data/db');
  mkdirp('data/logs');
  runCommand('mongod --fork --dbpath data/db --logpath data/logs/mongo.log');
});

gulp.task('mongo-stop', function() {
  runCommand('mongo admin --eval "db.shutdownServer();"');
});

gulp.task('nsp', function (done) {
  nsp({package: __dirname + '/package.json'}, done);
});

gulp.task('retire', function() {
  var child = spawn('retire', ['--ignore', paths.retirePathsToIgnore], {cwd: process.cwd()});

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function (data) {
      gutil.log(data);
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function (data) {
      gutil.log(gutil.colors.red(data));
  });
});

gulp.task('vuln', ['nsp', 'retire']);

gulp.task('default', ['lint', 'test', 'build', 'vuln']);