'use strict';

var sortBy = require('lodash').sortBy;
var first = require('lodash').first;
var last = require('lodash').last;

function getPercentile(percentile, values) {
  var i = (percentile/100) * values.length;

  if (Math.floor(i) === i) {
    return (values[i-1] + values[i])/2;
  } else {
    return values[Math.floor(i)];
  }
}

module.exports = {
  type: 'Timer',
  deps: ['Time'],
  func: function Timer (time) {

    function make (namespace, plugin, name, frequency) {
      var samples = [];
      var totalDuration = 0;
      var counter = 0;
      var startTime;

      function start () {
        startTime = time().present();
      }

      function stop () {
        var duration = time().present() - startTime;

        add(duration);
      }

      function add (duration) {
        if (counter === frequency) {
          samples.push(duration);
          totalDuration += duration;
          counter = 0;
        }
        counter += 1;
      }

      function results () {
        samples = sortBy(samples);

        return {
          namespace: namespace,
          plugin: plugin,
          name: name,
          frequency: frequency,
          samples: samples.length,
          min: first(samples),
          max: last(samples),
          '50th': getPercentile(0.5, samples),
          '75th': getPercentile(0.75, samples),
          '95th': getPercentile(0.95, samples),
          '99th': getPercentile(0.99, samples)
        };
      }

      var timerObject = {
        fromHere: start,
        toHere: stop,
        manual: add,
        results: results
      };

      return timerObject;
    }

    return {
      make: make
    };
  }
};