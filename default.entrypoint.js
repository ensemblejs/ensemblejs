'use strict';

var entryPoint = require('ensemblejs/client');
entryPoint.loadWindow(require('window'));
entryPoint.loadDefaults();
entryPoint.loadClientFolder(require('../game/js/logic/**/*.js', {mode: 'hash'} ));
entryPoint.loadClientFolder(require('../game/js/maps/**/*.js', {mode: 'hash'} ));
entryPoint.loadClientFolder(require('../game/js/events/**/*.js', {mode: 'hash' }));
entryPoint.loadClientFolder(require('../game/js/views/**/*.js', {mode: 'hash' }));