'use strict';

var post = require('../../util/request-handling').post;
var get = require('../../util/request-handling').get;

var newSave = require('../../util/workflow/new-save');
var addPlayerToSave = require('../../util/workflow/add-player-to-save');
var continueSave = require('../../util/workflow/continue-save');
var saveIsFull = require('../../util/workflow/save-is-full');
var shareSave = require('../../util/workflow/share-save');
var joinSave = require('../../util/workflow/join-save');
var selectDeviceMode = require('../../util/workflow/select-device-mode');

function pickGameView (req) {
  if (!req.query.deviceMode) {
    return 'game.pug';
  }
  if (req.query.deviceMode === 'gamepad') {
    return 'gamepad.pug';
  }
  if (req.query.deviceMode === 'mobile') {
    return 'mobile.pug';
  }

  return 'game.pug';
}

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

      app.get('/saves/:saveId/join', get(
        joinSave(project, savesList()), 'join.pug')
      );
      app.get('/saves/:saveId/share', get(
        shareSave(project, savesList()), 'share.pug')
      );
      app.get('/saves/:saveId/selectDeviceMode', get(
        selectDeviceMode(project, savesList()), 'select-device-mode.pug')
      );
      app.get('/saves/:saveId', get(
        continueSave(savesList(), on()), pickGameView)
      );
      app.get('/saves/:saveId/full', get(
        saveIsFull(savesList()), 'full.pug')
      );
    }

    return {
      configure: configure
    };
  }
};