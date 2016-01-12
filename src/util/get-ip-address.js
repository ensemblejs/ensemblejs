'use strict';

var os = require('os');
var ifaces = os.networkInterfaces();
import {each, filter} from 'lodash/collection';
import {first} from 'lodash/array';

function getIpAddress () {
  var ipAddresses = [];

  each(Object.keys(ifaces), function (ifname) {
    var interfaces = filter(ifaces[ifname], {family: 'IPv4', internal: false});
    each(interfaces, function (iface) {
      ipAddresses.push(iface.address);
    });
  });

  return first(ipAddresses);
}

module.exports = getIpAddress;