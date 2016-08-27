'use strict';

import { plugin } from './plugins/plug-n-play';
import startsWith from 'lodash/startsWith';
import definePlugin from './plugins/plug-n-play';

export default definePlugin;

export const define = definePlugin;
export const config = () => plugin('Config').get();
export const logger = () => plugin('Logger') || console;

export function before (name, ...rest) {
  if (startsWith(name, 'Before')) {
    define(name, ...rest);
  } else {
    define(`Before${name}`, ...rest);
  }
}

export function on (name, ...rest) {
  if (startsWith(name, 'On')) {
    define(name, ...rest);
  } else {
    define(`On${name}`, ...rest);
  }
}

export function after (name, ...rest) {
  if (startsWith(name, 'After')) {
    define(name, ...rest);
  } else {
    define(`After${name}`, ...rest);
  }
}