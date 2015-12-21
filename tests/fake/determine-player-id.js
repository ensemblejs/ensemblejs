'use strict';

module.exports = function (req, res, next) {
  req.player = {
    id: '1234',
    name: 'Ryan'
  };
  next();
};