'use strict';

import define from './plugins/plug-n-play';

export function before (name, ...rest) {
  define(`Before${name}`, ...rest);
}

export function on (name, ...rest) {
  define(`On${name}`, ...rest);
}

export function after (name, ...rest) {
  define(`After${name}`, ...rest);
}