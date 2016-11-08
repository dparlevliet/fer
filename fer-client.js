global.__basedir = __dirname;
require('./bin/cortex/global_fer.js');
/* global fer */

var Q = require('q');
var requestify = require('requestify');
var config = require('./bin/conf/client-config.js');
var FileUtils = require('./bin/cortex/file_utils.js');
var log = require('./bin/cortex/log.js');
var fs = require('fs');


fer.do(function(deferred) {
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
    var files = JSON.parse(response.body);

    var lfiles = [];
    files.forEach(function(file) {
      if (file.forEach) {
        lfiles = lfiles.concat(file);
      }
    });

    if (lfiles.length == 0) {
      return deferred.resolve();
    }

    fer.reduce(lfiles, function(file, offset, deferred) {
      var install_file = function(fpath, file) {
        log('Installing file: ' + fer_server + '/get-file/?file='+file.path.replace(__dirname, ''));
        requestify.get(
          fer_server + '/get-file/?file='+file.path
        ).then(function(response) {
          response.getBody();
          if (response.code == 200) {
            fs.writeFileSync(fpath, response.body);
          }
          deferred.resolve();
        });
        return deferred.resolve();
      };

      if (file.type) {
        if (file.type == 'directory') {
          deferred.resolve();
        } else {
          var fpath = (file.path).replace(/\.\.\//, '');
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
                  log("  SHA or MD5 doesn't match.");
                  install_file(file.path, file);
                } else {
                  deferred.resolve();
                }
              });
            }
          } catch (e) {
            install_file(file.path, file);
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
  });
}).then(function(){
  log("Fer: OK. I'm starting now ...");
  var cp = require('child_process');
  var client = cp.fork('./bin/client.js');

  process.on('SIGINT', function () {
    client.kill();
    process.exit();
  });
});