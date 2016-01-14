'use strict';

module.exports = function (req, res, next) {
  req.device = {
    _id: 'd1234'
  };
  next();
};