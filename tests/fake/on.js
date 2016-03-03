'use strict';

var sinon = require('sinon');
var each = require('lodash').each;
var realOn = require('../../src/events/shared/on').func();
var Bluebird = require('bluebird');

var fakeOn = {
  clientConnect: function () { return Bluebird.resolve(); },
  saveReady: function () { return Bluebird.resolve(); }
};

each(realOn, function (f, name) {
  if (fakeOn[name]) {
    sinon.spy(fakeOn, name);
  } else {
    fakeOn[name] = sinon.spy();
  }
});

module.exports = fakeOn;