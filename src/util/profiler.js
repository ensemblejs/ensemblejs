'use strict';

var numeral = require('numeral');

function defaultProfilerResults(namespace, plugin, name) {
  return {
    namespace: namespace,
    plugin: plugin,
    name: name,
    frequency: 0,
    samples: 0,
    min: 0,
    max: 0,
    '50th': 0,
    '75th': 0,
    '95th': 0,
    '99th': 0
  };
}

function updateProfilerResults ($, id, results) {
  $()('#' + id + '-rate .value').text(numeral(results.rate).format('0'));
  $()('#' + id + '-samples .value').text(numeral(results.samples).format('0,0'));
  $()('#' + id + '-min .value').text(numeral(results.min).format('0.00'));
  $()('#' + id + '-max .value').text(numeral(results.max).format('0.00'));
  $()('#' + id + '-50th .value').text(numeral(results['50th']).format('0.00'));
  $()('#' + id + '-75th .value').text(numeral(results['75th']).format('0.00'));
  $()('#' + id + '-95th .value').text(numeral(results['95th']).format('0.00'));
  $()('#' + id + '-99th .value').text(numeral(results['99th']).format('0.00'));
}

module.exports = {
  defaultProfilerResults: defaultProfilerResults,
  updateProfilerResults: updateProfilerResults
};