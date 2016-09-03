'use strict';

import { read } from './dot-string-support';

export const wrap = (state) => ({
  get: (key) => wrap(read(state, key)),
  toJS: state && state.toJS || state
});

