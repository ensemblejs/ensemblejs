'use strict';

var del = require('del');
var paths = require('./paths');

function addTasks (gulp) {
  gulp.task('delete-targets', function (done) {
      del(paths.targets.clean).then(() => done());
  });

  gulp.task('project:clean', ['delete-targets', 'db:reset']);


  gulp.task('framework:delete-paths', function (done) {
      del(paths.framework.clean).then(() => done());
  });

  gulp.task('framework:clean', ['framework:delete-paths']);

  gulp.task('tidydeps', function (done) {
    del([
      'node_modules/**/doc',
      'node_modules/**/docs',
      'node_modules/**/test',
      'node_modules/**/tests',
      'node_modules/**/spec',
      'node_modules/**/bench',
      'node_modules/**/scripts',
      'node_modules/**/example',
      'node_modules/**/examples',
      'node_modules/**/demo',
      'node_modules/**/pkg',
      'node_modules/**/*.md',
      'node_modules/**/*.markdown',
      'node_modules/**/*.spec.js',
      'node_modules/**/*.png',
      'node_modules/**/man',
      'node_modules/**/rfc'
    ])
  })
}

module.exports = addTasks;