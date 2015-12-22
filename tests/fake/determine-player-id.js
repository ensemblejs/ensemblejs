'use strict';

module.exports = function (req, res, next) {
  req.player = {
    _id: '1234',
    name: 'Ryan'
  };
  next();
};