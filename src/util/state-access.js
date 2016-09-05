'use strict';

import read from 'ok-selector';

export const wrap = (state) => ({
  get: (key) => wrap(read(state, key)),
  toJS: state && state.toJS || state
});

