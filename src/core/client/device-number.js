'use strict';

module.exports = {
  type: 'Device',
  deps: ['DefinePlugin'],
  func: function (define) {
    var deviceNumber;

    define()('OnClientDeviceNumber', function () {
      return function setDeviceNumber (number) {
        deviceNumber = number;
      };
    });

    return {
      number: () => deviceNumber
    };
  }
};