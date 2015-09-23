'use strict';

var Mixpanel = require('mixpanel');
var os = require('os');
var merge = require('lodash').merge;
var each = require('lodash').each;
var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
var ensemblePackageInfo = require(appRoot + '/node_modules/ensemblejs/package.json');

module.exports = {
  type: 'Metrics',
  deps: ['Logger', 'Commit'],
  func: function Metrics (logger, commit) {
    var mixpanel;

    function mixpanelConfigured() {
      return process.env.MIXPANEL_KEY !== undefined;
    }

    function postToMixpanel (name, event) {
      if (!mixpanelConfigured()) {
        return;
      }

      //jshint camelcase: false
      event.distinct_id = event.source;

      mixpanel.track(name, event);
    }

    function setupTargets () {
      if (mixpanelConfigured()) {
        logger().info('Metrics target Mixpanel configured');
        mixpanel = Mixpanel.init(process.env.MIXPANEL_KEY);
      }
    }

    setupTargets();

    function game () {
      return {
        'game-name': packageInfo.name,
        'game-version': packageInfo.version,
        'game-commit': commit().sha
      };
    }

    function identity () {
      return {
        'source': os.hostname()
      };
    }

    function platform () {
      return {
        'ensemble-version': ensemblePackageInfo.version,
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
      var event = data || {};

      event = merge(event, identity());
      event = merge(event, game());
      event = merge(event, platform());

      return event;
    }

    return {
      major: function track (name, data) {
         var event = merge(buildBasicEventData(data), platformDetailed());

        postToMixpanel(name, event);
      },
      track: function track (name, data) {
        var event = buildBasicEventData(data);

        postToMixpanel(name, event);
      },
      error: function error (name, data) {
        var event = merge(buildBasicEventData(data), platformDetailed());

        postToMixpanel(name, event);
        logger().error(event, name);
      }
    };
  }
};
