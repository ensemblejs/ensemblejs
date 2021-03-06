'use strict';

var fs = require('fs');
var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var flatten = require('gulp-flatten');
var mergeJson = require('gulp-merge-json-sets');
var plumber = require('gulp-plumber');
var browserify = require('browserify');
var sourcemaps = require('gulp-sourcemaps');
var through2 = require('through2');
var path = require('path');
var less = require('gulp-less');
var gulpBabel = require('gulp-babel');

var paths = require('./paths');
var generateEntrypointFile = require('./util/generate-entrypoint-file');
var generateDeviceModeFile = require('./util/generate-device-mode-file');
var onError = require('./util/error');

function isDevelopment () {
  return process.env.NODE_ENV !== 'production';
}

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

      for(let i = 0; i < arr.length; i += 1) {
        generateEntrypointFile(arr[i], copied);
      }
    });
  });

  gulp.task('copy-device-modes', ['project:prep'], function (done) {
    fs.exists('game/js/device-modes.json', function (exists) {
      let arr;
      if (!exists) {
        arr = [{ name: 'default' }];
      } else {
        arr = require(`${process.cwd()}/game/js/device-modes.json`);
      }

      let copyCount = 0;

      function copied () {
        copyCount += 1;
        if (copyCount === arr.length) {
          done();
        }
      }

      for(let i = 0; i < arr.length; i += 1) {
        generateDeviceModeFile(arr[i], copied);
      }
    });
  });

  gulp.task('generate-entrypoints', [
    'copy-multi-entry-points', 'copy-single-entry-point', 'copy-device-modes'
  ]);

  var babelConfig = {
    presets: ['es2015'],
    plugins: ['transform-object-rest-spread']
  };

  var browserified = through2.obj(function(file, enc, next) {
    return browserify({entries: file, debug: isDevelopment()})
      .transform(require('envify'))
      .transform(require('babelify'), babelConfig)
      .transform(require('require-globify'))
      .transform(require('pugify'), {
        compileDebug: isDevelopment(),
        pretty: isDevelopment(),
        runtimePath: require('pug-runtime')
      })
      .bundle(function (err, res) {
        if (err) {
          console.error(err.message);
        }

        file.contents = res;
        next(null, file);
      });
  });

  gulp.task('project:build:code', ['project:prep', 'generate-entrypoints'], function() {
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

  gulp.task('project:copy-json', ['project:prep'], function () {
    return gulp.src(paths.src.json).pipe(gulp.dest('dist/js'));
  })

  gulp.task('project:copy-js', ['project:prep'], function () {
    return gulp.src(paths.src.js)
      .pipe(plumber({errorHandler: onError}))
      .pipe(gulpBabel())
      .pipe(gulp.dest('dist/js'));
  });

  gulp.task('project:copy-source', ['project:copy-js', 'project:copy-json']);

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