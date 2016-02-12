'use strict';

module.exports = function (req, res, next) {
  req.player = {
    id: 'p1234'
  };
  next();
};