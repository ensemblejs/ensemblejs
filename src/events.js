'use strict';

import define from './define';
import {startsWith} from 'lodash';

export function before (name, ...rest) {
  if (startsWith(name, 'Before')) {
    define(...arguments);
  } else {
    define(`Before${name}`, ...rest);
  }
}

export function on (name, ...rest) {
  if (startsWith(name, 'On')) {
    define(...arguments);
  } else {
    define(`On${name}`, ...rest);
  }
}

export function after (name, ...rest) {
  if (startsWith(name, 'After')) {
    define(...arguments);
  } else {
    define(`After${name}`, ...rest);
  }
}