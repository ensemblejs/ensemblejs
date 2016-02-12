'use strict';

var del = require('del');
var paths = require('./paths');

function addTasks (gulp) {
  gulp.task('delete-targets', function (done) {
      del(paths.targets.clean, done);
  });

  gulp.task('project:clean', ['delete-targets', 'db:reset']);


  gulp.task('framework:delete-paths', function (cb) {
      del(paths.framework.clean, cb);
  });

  gulp.task('framework:clean', ['framework:delete-paths']);
}

module.exports = addTasks;