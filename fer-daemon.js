/**
 * Source: http://stackoverflow.com/questions/24750395/reload-express-js-routes-changes-without-restarting-server
 */
var cp = require('child_process');
var fs = require('fs');
var server = cp.fork('fer-server.js');
console.log('Daemon started');

fs.watchFile('fer-server.js', function (event, filename) {
  console.log('[ '+(new Date()).toISOString()+' ] Fer: Server file changed. Restarting process ...');
  server.kill();
  server = cp.fork('fer-server.js');
});

process.on('SIGINT', function () {
  server.kill();
  fs.unwatchFile('fer-server.js');
  process.exit();
});