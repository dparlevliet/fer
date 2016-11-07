/* global fer */
var os = require("os");

/**
 * Handles the configuration of a Fer component.
 */
module.exports = (function() {
  var parent = this;

  parent.hostname = os.hostname();
  parent.ip4s = [];
  parent.ip6s = [];

  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if (iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1/::1)
        return;
      }

      if (iface.family === 'IPv4') {
        parent.ip4s.push(iface.address);
      } else if (iface.family === 'IPv6') {
        parent.ip6s.push(iface.address);
      }
    });
  });

  return parent;
}());