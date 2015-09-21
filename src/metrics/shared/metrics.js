'use strict';

var Mixpanel = require('mixpanel');

module.exports = {
  type: 'Metrics',
  func: function Metrics () {
    var mixpanel = Mixpanel.init(process.env.MIXPANEL_KEY);

    function postToMixpanel (name, event) {
      event.distinct_id = event.source;

       mixpanel.track(name, event);
    }

    return {
      event: function track (name, data) {
        var event = data || {};
        event.source = 'ensemblejs-server-dev';

        postToMixpanel(name, event);
      }
    };
  }
};
