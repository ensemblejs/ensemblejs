'use strict';

import {loadClientFolder, set, run} from 'ensemblejs/client';
loadClientFolder(require('../game/js/logic/**/*.js', {mode: 'hash'} ));
loadClientFolder(require('../game/js/maps/**/*.js', {mode: 'hash'} ));
loadClientFolder(require('../game/js/events/**/*.js', {mode: 'hash' }));
loadClientFolder(require('../game/js/views/**/*.js', {mode: 'hash' }));