global.__basedir = __dirname;
process.chdir(__dirname);

require('./bin/cortex/global_fer.js');
/* global fer */

var Q = require('q');
var requestify = require('requestify');
var config = require('./bin/conf/client-config.js');
var FileUtils = require('./bin/cortex/file_utils.js');
var log = require('./bin/cortex/log.js');
var fs = require('fs');
var mkdirp = require('mkdirp');
fer.argv = require('yargs').argv;
var newPackages = false;


fer.do(function(deferred) {
  if (fer.argv.skipSync || fer.argv.standalone) {
    return deferred.resolve();
  }
  log("Fer: I need to sync first ...");
  var fer_server = 'http' +
    ((config.source_ssl)?'s':'') + '://' +
    config.source_hostname +
    ((config.source_port)?':'+config.source_port:'');

  // Checks to make sure we're about to run the most recent version of Fer.
  // If not, download the most recent version from the server.
  requestify.get(
    fer_server + '/client-files/'
  ).then(function(response) {
    response.getBody();
    var lfiles = JSON.parse(response.body);
    if (lfiles.length == 0) {
      return deferred.resolve();
    }

    fer.reduce(lfiles, function(file, offset, deferred) {
      var install_file = function(fpath, file) {
        return fer.time(function(deferred) {
          var rPath = file.path.replace(__dirname, '');
          fer.log(5, 'Downloading {1}'.format(rPath), 1);
          var url = fer_server + '/get-file/?_t='+((new Date()).getTime())+'&nonRelative=true&file='+rPath;
          requestify.get(
            url
          ).then(function(response) {
            response.getBody();
            if (response.code == 200) {
              mkdirp(fer.path.dirname(fpath), function(err) {
                if (err) {
                  return console.log(err);
                }
                fs.writeFileSync(fpath, response.body);
                deferred.resolve();
              });
            } else {
              return deferred.resolve();
            }
          }).fail(function(e) {
            log('Error asking for: ' + url);
            console.log(e);
            return deferred.resolve();
          });
        });
      };

      if (file.type) {
        if (
          file.type == 'directory' ||
          file.path.indexOf('node_modules') > -1 ||
          file.path.indexOf('bin/conf') > -1 ||
          file.path.indexOf('usr/files') > -1 ||
          file.path.indexOf('.git/') > -1
        ) {
          deferred.resolve();
        } else {
          var md5 = '';
          var sha1 = '';
          try {
            if (FileUtils.stat(file.path)) {
              FileUtils.fileMD5(file.path).then(function(sum) {
                md5 = sum;
                return FileUtils.fileSHA1(file.path);
              }).then(function(sum) {
                sha1 = sum;
                if (file.md5 != md5 || file.sha1 != sha1) {
                  //log("  SHA or MD5 doesn't match.");
                  install_file(file.path, file).then(function() {
                    if (file.path.indexOf('package.json') > -1) {
                      newPackages = true;
                    }
                    deferred.resolve();
                  });
                } else {
                  deferred.resolve();
                }
              });
            }
          } catch (e) {
            install_file(file.path, file).then(function() {
              if (file.path.indexOf('package.json') > -1) {
                newPackages = true;
              }
              deferred.resolve();
            });
          }
        }
      } else {
        console.log(file);
        log("Don't know how to handle file information provided. Skipping.");
        deferred.resolve();
      }
    }).then(function() {
      deferred.resolve();
    });
  }).fail(function(e) {
    console.log(e);
    deferred.resolve();
  });
}).then(function() {
  return fer.do(function(deferred) {
    if (newPackages) {
      log('Fer: Installing new npm packages');
      var cp = require('child_process');
      var npm = cp.spawn('/usr/bin/npm', ['--prefix', __dirname, '--unsafe-perm', 'install', __dirname ]);
      npm.stdout.on('data', function(data) {
        console.log(data.toString().trim());
      });
      npm.on('exit', function(code){
        log('Fer: Completed installing new npm packages.');
        deferred.resolve();
      });
    } else {
      deferred.resolve();
    }
  });
}).then(function() {
  if (!fer.argv.skipSync) {
    log('Fer: Sync complete.');
  }

  var cp = require('child_process');
  var client;
  var server;

  if (fer.argv.start) {
    log("Fer: OK. I'm starting now ...");
    client = cp.fork('./bin/client.js', process.argv.slice(2));

    client.on('exit', function() {
      var base = __dirname+'/usr/';
      fer.FileUtils.walk(base).then(function(list) {
        list.forEach(function(file) {
          try {
            file = base + file;
            if (
              fer.FileUtils.stat(file).isDirectory() ||
              file.indexOf('.gitkeep') > -1
            ) {
              return true;
            }
            fer.fs.unlink(file);
          } catch (e) {
            console.log(e);
          }
        });
      });
    });

    process.on('SIGINT', function () {
      process.exit();
    });
  } else {
    if (fer.argv.standalone) {
      log('Fer: Launching in to standalone mode');
      server = cp.spawn('/usr/bin/node', [__dirname+'/fer-server.js']);
      server.stdout.on('data', function(data) {
        console.log(data.toString().trim());
      });
    }
    client = cp.spawn('/usr/bin/node', [__dirname+'/fer-client.js', '--skip-sync','--start'].concat(process.argv.slice(2)));
    client.stdout.on('data', function(data) {
      console.log(data.toString().trim());
    });

    var kill = function() {
      if (fer.argv.standalone) {
        log('Fer Server: No longer listening');
      }
      if (client) {
        client.kill();
      }
      if (server) {
        server.kill();
      }
      process.exit();
    };

    client.on('exit', function(code){
      kill();
    });

    process.on('SIGINT', function () {
      kill();
    });
  }
});