'use strict';

var mkdirp = require('mkdirp');

function addTasks (gulp) {
  gulp.task('project:make-folders', ['project:clean'], function () {
    mkdirp('build/');
    mkdirp('dist/');
    mkdirp('dist/js/client/');
  });

  gulp.task('project:prep', ['project:make-folders']);
}

module.exports = addTasks;