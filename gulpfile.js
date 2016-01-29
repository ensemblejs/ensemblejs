
'use strict';

require('babel-register');

var gulp = require('gulp');
var gulpSequence = require('gulp-sequence');

var paths = require('./tasks/paths');

require('./tasks/mongo')(gulp);
require('./tasks/vuln')(gulp);
require('./tasks/cleanup')(gulp);
require('./tasks/linting')(gulp);
require('./tasks/framework-test')(gulp);
require('./tasks/framework-build')(gulp);

gulp.task('watch', function () {
  gulp.watch(paths.framework.scss, ['framework:build']);
});

gulp.task('default', gulpSequence(
  ['framework:lint', 'framework:test', 'framework:build', 'vuln'],'mongo:stop'
));