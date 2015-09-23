'use strict';

var getRepoInfo = require('git-repo-info');

module.exports = {
  type: 'Commit',
  func: function Commit () {
    return {
      sha: getRepoInfo().sha
    };
  }
};