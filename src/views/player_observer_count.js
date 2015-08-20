'use strict';

var numeral = require('numeral');

module.exports = {
  type: 'View',
  deps: ['StateTracker'],
  func: function View (tracker) {
    var $ = require('zepto-browserify').$;

    function updatePlayerCount (currentValue) {
      $('#player-count').text(numeral(currentValue).format('0a'));
    }
    function updateObserverCount (currentValue) {
      $('#observer-count').text(numeral(currentValue).format('0a'));
    }

    function playerCount (state) { return state.ensemble.players; }
    function observerCount (state) { return state.ensemble.observers; }

    return function updatePlayerAndObserverCounts () {
      tracker().onChangeOf(playerCount, updatePlayerCount);
      tracker().onChangeOf(observerCount, updateObserverCount);
    };
  }
};