'use strict';

var os = require('os');
var merge = require('lodash').merge;
var each = require('lodash').each;
var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
var ensemblePackageInfo = require('../../util/get-framework-info');
var config = require('../../util/config');
var logger = require('../../logging/server/logger').logger;
var request = require('request');
var moment = require('moment');

var endpoint = config.get().measure.endpoint;
var appId = config.get().game.id;

function post (event, url) {
  if (!config.get().server.metrics) {
    return;
  }

  request.post({
    headers: {'content-type' : 'application/json'},
    url: url,
    body: JSON.stringify(event)
  }, function (err) {
    if (err) {
      logger.error({err: err, event: event, url: url}, 'Failed posting event');
    }
  });
}

function postProfileData (profileData) {
  post(profileData, `${endpoint}/profile/${appId}`);
}

module.exports = {
  type: 'Metrics',
  deps: ['Commit', 'Time'],
  func: function Metrics (commit, time) {

    var startTime;

    function identity () {
      return {
        'source': os.hostname(),
        'commit': commit().sha,
        'start-time': startTime,
        'timestamp': moment(),
        'timestamp-unix': time().atStart(),
        'up-time': time().sinceStart(),
        'ensemble-version': ensemblePackageInfo.version,
      };
    }

    function platform () {
      return {
        'server-node-version': process.version,
        'server-os': os.type(),
        'server-os-version': os.release(),
        'server-platform': os.platform(),
        'server-arch': os.arch()
      };
    }

    function platformDetailed () {
      var props = {
        'server-os-uptime': os.uptime(),
        'server-os-totalmem': os.totalmem(),
        'server-os-freemem': os.freemem(),
        'server-node-uptime': process.uptime(),
        'server-cpu-count': os.cpus().length
      };

      each(process.memoryUsage(), function (value, type) {
        props['server-memory-' + type] = value;
      });

      each(process.versions, function (version, library) {
        props['node-dep-' + library] = version;
      });

      each(packageInfo.dependencies, function (version, library) {
        props['game-dep-' + library] = version;
      });

      delete props['node-dep-node'];
      delete props['game-dep-ensemblejs'];

      return props;
    }

    function buildBasicEventData (data) {
      startTime = startTime || time().present();
      var event = data || {};

      event = merge(event, identity());
      event = merge(event, platform());

      return event;
    }

    return {
      profile: function profile (name, data = {}) {
        var profileData = data;
        profileData = merge(profileData, identity());
        profileData = merge(profileData, {name: 'profile'});

        postProfileData(profileData);
      },
      major: function major (name, data) {
         var event = merge(buildBasicEventData(data), platformDetailed());
         event.name = name;

         post(event);
      },
      track: function track (name, data) {
        var event = buildBasicEventData(data);
        event.name = name;

        post(event);
      },
      error: function error (name, data) {
        var event = merge(buildBasicEventData(data), platformDetailed());
        event.name = name;

        post(event);
        logger.error({data: data}, name);
      }
    };
  }
};
