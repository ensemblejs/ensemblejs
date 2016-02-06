'use strict';

import {includes} from 'lodash';

const allDeviceModes = ['primary', 'observer', 'gamepad'];
export const supportsInput = ['primary', 'gamepad'];
export const supportsOutput = ['primary', 'observer'];

export function determineDeviceMode (requestedDeviceMode = 'primary') {
  if (!includes(allDeviceModes, requestedDeviceMode)) {
    return 'observer';
  }

  return requestedDeviceMode;
}