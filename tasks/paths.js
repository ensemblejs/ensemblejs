'use strict';

module.exports = {
  assets: ['game/assets/**'],
  src: ['game/js/**'],
  seeds: ['game/seeds/**'],
  build: ['build/**', 'dist/**'],
  genCss: './dist/css',
  genJs: './dist/js/client',
  genLocales: './dist/locales',
  js: ['game/**/*.js'],
  locales: ['./game/locales/*.json'],
  modes: ['./build/*.js'],
  scss: ['game/**/*.scss'],
  tests: ['tests/**/*.js'],
  targets: {
    build: 'build/',
    dist: 'dist/',
    clean: ['build/**', 'dist/**']
  },
  retirePathsToIgnore: [
    'node_modules/browserify/node_modules/insert-module-globals/node_modules/lexical-scope/bench'
  ]
};