'use strict';

module.exports = {
  type: 'Events',
  deps: ['Metrics', 'DefinePlugin', 'Time'],
  func: function Events (metrics, define, time) {

    define()('OnServerStart', function () {
      return function publish () {
        metrics().major('OnServerStart', {
          'time-since-start': time().sinceStart()
        });
      };
    });

    define()('OnServerStop', function () {
      return function publish () {
        metrics().major('OnServerStop', {
          duration: time().sinceStart()
        });
      };
    });

    define()('OnError', function () {
      return function publishError (err) {
        metrics().error('ServerError', {
          message: err.message,
          stacktrace: err.stack
        });
      };
    });
  }
};