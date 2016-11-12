'use strict';

const urlBuilder = require('../url-builder');
import {map} from 'lodash';

function buildJson (save, player, hostname, project) {

  const deviceModes = map(project.deviceModes, (deviceMode) => {
    const uri = urlBuilder(hostname).saves(save.id).continue({deviceMode: deviceMode.name});
    const { icon, name, label } = deviceMode;

    return { uri, icon, name, label };
  });

  return {
    game: {
      name: project.name
    },
    deviceModes
  };
}

module.exports = buildJson;