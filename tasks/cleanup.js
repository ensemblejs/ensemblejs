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
}

module.exports = addTasks;