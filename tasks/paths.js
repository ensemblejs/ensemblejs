'use strict';

module.exports = {
  assets: ['game/assets/**'],
  build: ['build/**', 'dist/**'],
  genCss: './dist/css',
  genJs: './dist/js/client',
  genLocales: './dist/locales',
  js: ['game/**/*.js'],
  locales: ['./game/locales/*.json'],
  modes: ['./build/*.js'],
  less: ['game/**/*.less'],
  seeds: ['game/seeds/**'],
  src: ['game/js/**'],
  tests: ['tests/**/*.js'],

  targets: {
    build: 'build/',
    clean: ['build/**', 'dist/**'],
    dist: 'dist/'
  },

  framework: {
    clean: ['public/css/*.css', 'data/db', 'data/logs'],
    js: ['ensemble.js', 'src/**/*.js'],
    less: ['src/less/**/*.less'],
    unitTests: ['tests/*.js', 'tests/**/*.js', '!tests/integration/**/*.js'],
    integrationTests: ['tests/integration/*.js', 'tests/integration/**/*.js'],
    allTests: ['tests/*.js', 'tests/**/*.js'],
    coveragejs: [
      'ensemble.js',
      'src/**/*.js',
      '!src/debug/**/*.js',
      '!src/metrics/**/*.js',
      '!src/logging/**/*.js'
    ],
    coverageinfo: ['coverage/**/lcov.info'],
    cssSrc: ['src/css/**/*.css'],
    jsToCopy: [
      'node_modules/clipboard/dist/clipboard.min.js',
      'bower_components/qrcode.js/qrcode.js'
    ]
  },

  retirePathsToIgnore: [
    'node_modules/browserify/node_modules/insert-module-globals/node_modules/lexical-scope/bench'
  ]
};