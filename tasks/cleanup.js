'use strict';

var del = require('del');
var paths = require('./paths');

function addTasks (gulp) {
  gulp.task('delete-targets', function (done) {
      del(paths.targets.clean, done);
  });

  gulp.task('project:clean', ['delete-targets', 'mongo:reset']);
}

module.exports = addTasks;