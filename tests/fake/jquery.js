'use strict';

var savedEvents = {};
var fake$ = {
  reset: function () { savedEvents = {}; },
  savedEvents: function () { return savedEvents; },
  on: function(name, f) {
    savedEvents[name] = savedEvents[name] || [];
    savedEvents[name].push(f);
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