'use strict';

module.exports = function (req, res, next) {
  req.player = {
    _id: 'p1234'
  };
  next();
};