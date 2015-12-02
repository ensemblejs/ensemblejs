'use strict';

var sinon = require('sinon');
var each = require('lodash').each;
var realOn = require('../../src/events/shared/on').func();

var fakeOn = {};
each(realOn, function (f, name) {
  fakeOn[name] = sinon.spy();
});

module.exports = fakeOn;