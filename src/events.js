import startsWith from 'lodash/startsWith';
import define from './define';

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

export function emit (name, ...rest) {

}