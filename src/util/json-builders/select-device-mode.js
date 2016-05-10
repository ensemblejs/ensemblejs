'use strict';

var urlBuilder = require('../url-builder');
import {map} from 'lodash';

function buildJson (save, player, hostname, project) {

  const links = map(project.deviceModes, deviceMode => {
    const uri = urlBuilder(hostname).saves(save.id).continue({deviceMode: deviceMode.name});

    return {
      uri: uri,
      icon: deviceMode.icon,
      name: deviceMode.name,
      label: deviceMode.label
    };
  });

  return {
    game: {
      name: project.name,
    },
    links: links
  };
}

module.exports = buildJson;