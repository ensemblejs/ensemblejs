'use strict';

require('babel-register')({only: /ensemblejs\/src/, presets: ['es2015-node4']});
module.exports = require('./src/server');