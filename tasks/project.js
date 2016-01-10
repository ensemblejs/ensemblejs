'use strict';

var paths = require('./paths');

function addTasks (gulp) {
  require('./ensemble-dev')(gulp);
  require('./mongo')(gulp);
  require('./cleanup')(gulp);
  require('./prep')(gulp);
  require('./test')(gulp);
  require('./build')(gulp);

  gulp.task('watch', function () {
    gulp.watch(paths.scss, ['project:build:styles']);
  });

  gulp.task('default', ['project:test', 'project:build']);
}

module.exports = addTasks;