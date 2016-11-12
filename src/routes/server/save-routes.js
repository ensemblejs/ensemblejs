'use strict';

import {filter} from 'lodash';

const post = require('../../util/request-handling').post;
const get = require('../../util/request-handling').get;

const newSave = require('../../util/workflow/new-save');
const addPlayerToSave = require('../../util/workflow/add-player-to-save');
const continueSave = require('../../util/workflow/continue-save');
const saveIsFull = require('../../util/workflow/save-is-full');
const shareSave = require('../../util/workflow/share-save');
const joinSave = require('../../util/workflow/join-save');
const selectDeviceMode = require('../../util/workflow/select-device-mode');

function pickGameView (project) {
  return function pickUsingDeviceModes (req) {
    const deviceMode = filter(project.deviceModes, {name: req.query.deviceMode});

    return (deviceMode.length === 0) ? 'game.pug' : deviceMode[0].template;
  };
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
        continueSave(project, savesList(), on()), pickGameView(project))
      );
      app.get('/saves/:saveId/full', get(
        saveIsFull(savesList()), 'full.pug')
      );
    }

    return { configure };
  }
};