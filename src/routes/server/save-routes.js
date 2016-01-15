'use strict';

var post = require('../../util/request-handling').buildPostRequestHandler;
var get = require('../../util/request-handling').buildGetRequestHandler;

var newSave = require('../../util/workflow/new-save');
var addPlayerToSave = require('../../util/workflow/add-player-to-save');
var continueSave = require('../../util/workflow/continue-save');
var saveIsFull = require('../../util/workflow/save-is-full');
var shareSave = require('../../util/workflow/share-save');
var joinSave = require('../../util/workflow/join-save');

module.exports = {
  type: 'Routes',
  deps: ['On', 'SavesList', 'Time'],
  func: function Routes (on, savesList, time) {

    function configure (app, project) {
      app.post('/saves', post(
        newSave(project, on(), time())
      ));

      app.post('/saves/:saveId/join', post(
        addPlayerToSave(project, savesList(), time())
      ));

      app.get('/saves/:saveId', get(
        continueSave(savesList(), on()), 'game.jade')
      );
      app.get('/saves/:saveId/join', get(
        joinSave(project, savesList()), 'join.jade')
      );
      app.get('/saves/:saveId/full', get(
        saveIsFull(savesList()), 'full.jade')
      );
      app.get('/saves/:saveId/share', get(
        shareSave(project, savesList()), 'share.jade')
      );
    }

    return {
      configure: configure
    };
  }
};