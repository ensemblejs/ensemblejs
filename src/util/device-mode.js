'use strict';

import {contains} from 'lodash/collection';

const allDeviceModes = ['primary', 'observer'];
export const supportsInput = ['primary'];
export const supportsOutput = ['primary', 'observer'];

export function determineDeviceMode (requestedDeviceMode = 'primary') {
  if (!contains(allDeviceModes, requestedDeviceMode)) {
    return 'observer';
  }

  return requestedDeviceMode;
}