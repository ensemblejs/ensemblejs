'use strict';

var mocha = require('gulp-mocha');
var paths = require('./paths');

function addTasks (gulp) {
  require('./cleanup')(gulp);

  gulp.task('project:test', ['project:clean'], function () {
    gulp.src(paths.framework.tests).pipe(mocha({reporter: 'spec'}));
  });
}

module.exports = addTasks;