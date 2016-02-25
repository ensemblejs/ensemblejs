'use strict';

var fs = require('fs');
var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var flatten = require('gulp-flatten');
var mergeJson = require('gulp-merge-json-sets');
var plumber = require('gulp-plumber');
var browserify = require('browserify');
var sourcemaps = require('gulp-sourcemaps');
var transform = require('vinyl-transform');
var path = require('path');
var less = require('gulp-less');
var rename = require('gulp-rename');
var flatten = require('gulp-flatten');
var plumber = require('gulp-plumber');

var paths = require('./paths');
var generateEntrypointFile = require('./util/generate-entrypoint-file');
var onError = require('./util/error');

function addTasks (gulp) {
  gulp.task('copy-single-entry-point', ['project:prep'], function (done) {
    fs.exists('game/js/modes.json', function (exists) {
      if (exists) {
        return done();
      }

      generateEntrypointFile('default', done);
    });
  });

  gulp.task('copy-multi-entry-points', ['project:prep'], function (done) {
    fs.exists('game/js/modes.json', function (exists) {
      if (!exists) {
        return done();
      }

      var arr = require(process.cwd() + '/game/js/modes.json');
      var copyCount = 0;

      function copied () {
        copyCount += 1;
        if (copyCount === arr.length) {
          done();
        }
      }

      var i;
      for(i = 0; i < arr.length; i += 1) {
        generateEntrypointFile(arr[i], copied);
      }
    });
  });

  gulp.task('generate-entrypoints', [
    'copy-multi-entry-points', 'copy-single-entry-point'
  ]);

  gulp.task('project:build:code', ['project:prep', 'generate-entrypoints'], function() {
    var browserified = transform(function(filename) {
      return browserify(filename, {debug: true})
        .transform(require('babelify'), {'presets': ['es2015']})
        .transform(require('require-globify'))
        .transform(require('pugify'), {
          compileDebug: true,
          pretty: true,
          runtimePath: require('pug-runtime')
        })
        .bundle();
    });

    var emptyCommonJs = path.join(process.cwd(), 'dist/js/client/common.min.js');
    fs.writeFileSync(emptyCommonJs, '');

    return gulp.src(paths.modes)
      .pipe(plumber({errorHandler: onError}))
      .pipe(browserified)
      .pipe(rename({suffix: '.min'}))
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(paths.genJs));
  });

  gulp.task('project:build:styles', ['project:prep'], function() {
      return gulp.src(paths.less)
        .pipe(plumber({errorHandler: onError}))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer({ cascade: false }))
        .pipe(less())
        .pipe(sourcemaps.write(paths.genCss))
        .pipe(rename({suffix: '.min'}))
        .pipe(flatten())
        .pipe(gulp.dest(paths.genCss));
  });

  gulp.task('project:merge-locales', ['project:prep'], function () {
    return gulp.src(paths.locales)
      .pipe(mergeJson(__dirname + '/../locales/'))
      .pipe(gulp.dest(paths.genLocales));
  });

  gulp.task('project:copy-source', ['project:prep'], function () {
    return gulp.src(paths.src).pipe(gulp.dest('dist/js'));
  });

  gulp.task('project:copy-seeds', ['project:prep'], function () {
    return gulp.src(paths.seeds).pipe(gulp.dest('dist/seeds'));
  });

  gulp.task('project:copy-assets', ['project:prep'], function () {
    return gulp.src(paths.assets).pipe(gulp.dest('dist/assets'));
  });

  gulp.task('project:copy-files', [
    'project:copy-source', 'project:copy-seeds', 'project:copy-assets'
  ]);

  gulp.task('project:build', [
    'project:build:styles',
    'project:build:code',
    'project:merge-locales',
    'project:copy-files'
  ]);
}

module.exports = addTasks;