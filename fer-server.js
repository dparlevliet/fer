var express         = require('express');
var app             = express();
var fs              = require('fs');
require('./bin/cortex/global_fer.js');

/* global FileUtils */
global.FileUtils    = require('./bin/cortex/file_utils.js');

/* global config */
global.config       = require('./bin/conf/server-config.js');

/* global __basedir */
global.__basedir    = __dirname;

/**
 * Returns information about the most current client on the master server. The
 * client server will call this url before doing anything, and if the version
 * on that server does not match the one on the master server it will download
 * it and relaunch its self.
 */
app.get('/client-files/', function (req, res) {
  FileUtils.walkSumList([
    __basedir+'/bin',
    __basedir+'/usr',
    __basedir+'/node_modules',
  ]).then(function(list) {
    res.send(JSON.stringify(list));
  });
});


app.get('/get-file/', function (req, res) {
  var file = __dirname + '/usr/files/' + req.query.file.replace(/[\.]+\//g, '');
  try {
    if (FileUtils.stat(file).isDirectory()) {
      res.status(404).send('Not found');
    } else {
      res.sendfile(file);
    }
  } catch (e) {
    res.status(404).send('Not found');
  }
});

// Attach any module urls
(function() {
  fs.readdirSync(
    __dirname + '/bin/modules/'
  ).forEach(function (name) {
    try {
      var module = require('./bin/modules/' + name + '/server/index.js');
    } catch(e) {
      // this module doesn't have any client rules
      return true;
    }

    for (var key in module.handles) {
      var urls = module.handles[key];
      urls.forEach(function(url) {
        console.log('Adding /modules/'+key+'/'+url.uri);
        app[url.method]('/modules/'+key+'/'+url.uri, url.callback);
      });
    }
  });
}());


/**
 * Start the server
 */
app.listen(config.port, config.bind, function () {
  console.log('[ '+(new Date()).toISOString()+' ] Fer: I am listening on '+config.bind+':'+config.port+'!');
});