var express         = require('express');
var app             = express();
var http            = require('http').createServer(app);
var io              = require('socket.io').listen(http);
var metrinix        = require('metrinix');


require('./bin/cortex/global_fer.js');

/* global FileUtils */
global.FileUtils    = require('./bin/cortex/file_utils.js');

/* global config */
global.config       = require('./bin/conf/dashboard-config.js');

app.use('/socket.io-client/', express.static('node_modules/socket.io-client/dist'));
app.use('/', express.static('bin/dashboard'));

io.on('connection', function(socket) {
  var FREQUENCY = 5000;

  var dashboardListening = false;
  var dashboardTruncateMode = true;
  var dashboard = {};
  var tty;

  socket.on('disconnect', function() {
    dashboardListening = false;
  });

  socket.on('route-change', function() {
    dashboardListening = false;
  });

  socket.on('dashboard-truncated', function(msg) {
    dashboardTruncateMode = msg;
  });

  // start monitoring
  socket.on('dashboard-listen', function(message) {
    if (dashboardListening) {
      return true;
    }
    dashboardListening = true;
    [
      'ps',
      'df',
      'memory',
      'network',
      'cpuUsage',
    ].forEach(function(key) {
      dashboard[key] = function() {
        metrinix[key]().then(function(result) {
          if (dashboardTruncateMode) {
            if (key === 'ps') {
              var processes = [];
              Object.keys(result).forEach(function(pid) {
                var process = result[pid];
                if (process.cpu.totalPercent > 0) {
                  processes.push(process);
                }
              });
              result = processes;
            }
          }
          io.emit('dashboard-'+key, result);
          if (dashboardListening === true) {
            setTimeout(dashboard[key], FREQUENCY);
          }
        }).fail(function(e) {
          console.log(e);
        });
      };
      dashboard[key]();
    });
  });

  socket.on('dashboard-frequency', function(message) {
    if (isNaN(Number(message)) || Number(message.frequency) < 1000) {
      message.frequency = 1000;
    }
    FREQUENCY = message.frequency;
  });

  socket.on('tty-new', function(message) {
    tty = require('tty.js');
    tty = tty.createServer({
      shell: 'bash',
      "hostname": "0.0.0.0",
      users: {
      },
      port: 18000
    });
    tty.listen();
    io.emit('tty-ready', true);
  });

});

/**
 * Start the server
 */
http.listen(config.port, config.bind, function () {
  console.log('[ '+(new Date()).toISOString()+' ] Fer Dashboard: I am listening on '+config.bind+':'+config.port+'!');
});