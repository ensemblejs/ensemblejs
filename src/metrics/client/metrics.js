'use strict';

//jshint browser: true

var merge = require('lodash').merge;
var ensemblePackageInfo = require('../../../package.json');
var logger = require('../../logging/client/logger').logger;
var request = require('request');
var moment = require('moment');

module.exports = {
  type: 'Metrics',
  deps: ['Commit', 'Time', 'Config'],
  func: function Metrics (commit, time, config) {

    var startTime;
    var startTimeUnix = moment().unix();

    var endpoint = config().measure.endpoint;
    var appId = config().game.id;

    function post (event, url = `${endpoint}/event/${appId}`) {
      request.post({
        headers: {'content-type' : 'application/json'},
        url: url,
        body: JSON.stringify(event)
      }, function (err) {
        if (err) {
          logger.error({err: err}, 'Failed posting event');
        }
      });
    }

    function postProfileData (profileData) {
      post(profileData, `${endpoint}/profile/${appId}`);
    }

    function identity () {
      return {
        'source': 'distributedlife-client',
        // 'playerId': 'playerId',
        // 'saveId': 'saveId',
        'commit': commit(),
        'timestamp': moment(),
        'timestamp-unix': startTimeUnix,
        'time-at-start': time().atStart(),
        'up-time': time().sinceStart(),
        'ensemble-version': ensemblePackageInfo.version,
      };
    }

    function platform () {
      return {
        'client-appCodeName': navigator.appCodeName,
        'client-appName': navigator.appName,
        'client-appVersion': navigator.appVersion,
        'client-product': navigator.product,
        'client-product-sub': navigator.productSub,
        'client-os': navigator.platform,
        'client-language': navigator.language,
        'client-languages': navigator.languages,
        'client-buildid': navigator.buildID,
        'client-vendor': navigator.vendor,
        'client-vendor-sub': navigator.vendorSub,
        'user-agent': navigator.userAgent,

        'cookie-enabled': navigator.cookieEnabled,
        'do-not-track': navigator.doNotTrack
      };
    }

    function platformDetailed () {
      var props = {
        // 'server-os-uptime': os.uptime(),
        // 'server-os-totalmem': os.totalmem(),
        // 'server-os-freemem': os.freemem(),
        // 'server-node-uptime': process.uptime(),
        'client-cpu-count': navigator.hardwareConcurrency || navigator.oscpu
      };

      // each(process.memoryUsage(), function (value, type) {
      //   props['server-memory-' + type] = value;
      // });

      // each(process.versions, function (version, library) {
      //   props['node-dep-' + library] = version;
      // });

      // each(packageInfo.dependencies, function (version, library) {
      //   props['game-dep-' + library] = version;
      // });

      // delete props['node-dep-node'];
      // delete props['game-dep-ensemblejs'];

      return props;
    }

    function buildBasicEventData (data) {
      startTime = moment();
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
         event = merge(event, {name: name});

         post(event);
      },
      track: function track (name, data) {
        var event = buildBasicEventData(data);
        event = merge(event, {name: name});

        post(event);
      },
      error: function error (name, data) {
        var event = merge(buildBasicEventData(data), platformDetailed());
        event = merge(event, {name: name});

        post(event);
        logger.error({data: data}, name);
      }
    };
  }
};
