'use strict';

module.exports = function (req, res, next) {
  req.device = {
    id: 'd1234'
  };
  next();
};