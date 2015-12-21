'use strict';

var sinon = require('sinon');

module.exports = function (req, res, next) {
  res.locals.__ = sinon.spy();
  next();
};