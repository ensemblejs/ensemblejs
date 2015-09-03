'use strict';

var savedEvents = {};
var fake$ = {
  reset: function () { savedEvents = {}; },
  savedEvents: function () { return savedEvents; },
  on: function(name, f) {
    savedEvents[name] = savedEvents[name] || [];
    savedEvents[name].push(f);
  },
  keydown: function (f) {
    savedEvents.keydown = savedEvents.keydown || [];
    savedEvents.keydown.push(f);
  },
  keyup: function (f) {
    savedEvents.keyup = savedEvents.keyup || [];
    savedEvents.keyup.push(f);
  }
};

function fake$wrapper () {
  return fake$;
}

module.exports = {
  $: fake$,
  fakeWith: function fake (suppliedFake) {
    fake$ = suppliedFake;

    return fake$wrapper;
  }
};