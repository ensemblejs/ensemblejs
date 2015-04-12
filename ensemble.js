#!/usr/bin/env node
'use strict';

var path = process.argv[2];
if (path === undefined) {
  throw 'No game path specified';
}

require('./src/facade').runGameAtPath(path);