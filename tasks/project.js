'use strict';

var paths = require('./paths');

function addTasks (gulp) {
  require('./mongo')(gulp);
  require('./cleanup')(gulp);
  require('./prep')(gulp);
  require('./project-test')(gulp);
  require('./project-build')(gulp);

  gulp.task('watch', function () {
    gulp.watch(paths.scss, ['project:build:styles']);
  });

  gulp.task('default', ['project:test', 'project:build']);
}

module.exports = addTasks;