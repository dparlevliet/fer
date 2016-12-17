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

app.use('/dashboard', express.static('bin/dashboard'));
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
    __basedir+'/fer-client.js',
    __basedir+'/package.json',
  ]).then(function(list) {
    var lfiles = [];

    list.forEach(function(files) {
      if (!files.forEach) {
        files = [files];
      }
      files.forEach(function(file) {
        if (
          file.path.indexOf('node_modules') > -1 ||
          file.path.indexOf('bin/conf') > -1 ||
          file.path.indexOf('usr/files') > -1
        ) {
          return true;
        } else {
          lfiles.push(file);
        }
      });
    });
    res.send(JSON.stringify(lfiles));
  }).fail(function(e) {
    console.log(e);
    res.status(400).send('Error');
  });
});


app.get('/get-file/', function (req, res) {
  var file;
  if (req.query.nonRelative == 'true') {
    file = __dirname + '/' + req.query.file.replace(/[\.]+\//g, '');
  } else {
    file = __dirname + '/usr/files/' + req.query.file.replace(/[\.]+\//g, '');
  }
  file = file.replace('//', '/');
  try {
    if (!FileUtils.stat(file)) {
      return res.status(422).send('File doesnt exist');
    }
    if (FileUtils.stat(file).isDirectory()) {
      res.status(422).send('File is a directory');
    } else {
      res.sendfile(file, {dotfiles: 'allow'});
    }
  } catch (e) {
    res.status(422).send('File doesnt exist');
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
  console.log('[ '+(new Date()).toISOString()+' ] Fer Server: I am listening on '+config.bind+':'+config.port+'!');
});