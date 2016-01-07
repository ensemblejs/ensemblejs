'use strict';

var map = require('lodash').map;
var remove = require('lodash').remove;
var mongo = require('./mongo');
var Bluebird = require('bluebird');
var logger = require('../logging/server/logger').logger;
var saves = require('./models/saves');

var queue = [];

function saveOrQueue (data, now) {
  if (!mongo.isConnected()) {
    queue.push(data);
    logger.info('No connection to MongoDB. Save not saved. Save queued until connection established.', {id: data.ensemble.saveId});
    return false;
  } else {
    return saves.save(data, now);
  }
}

function flushPendingSaves (now) {
  logger.info('Flushing Pending Saves');

  var toFlush = remove(queue, function() { return true; });
  toFlush = map(toFlush, function (save) {
    return saveOrQueue(save, now);
  });

  return Bluebird.all(toFlush);
}

module.exports = {
  saveOrQueue: saveOrQueue,
  flushPendingSaves: flushPendingSaves
};