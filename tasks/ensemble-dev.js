'use strict';

var runCommand = require('./util/run-command');

function addTasks (gulp) {
  gulp.task('edev:sync:offine', function () {
    runCommand('rm -rf node_modules/ensemblejs && cp -r ~/projects/ensemblejs node_modules && rm -rf node_modules/ensemblejs/.git');
  });

  gulp.task('edev:sync:online', function () {
    runCommand('npm i ~/projects/ensemblejs -S');
  });
}

module.exports = addTasks;