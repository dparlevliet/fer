/* global fer */
var mkdirp = require('mkdirp');

var FileInstaller = (function() {
  /**
   *
   * Example:
       {
        file_install: {
          '/tmp/test.txt': {
            group: 'root',
            owner: 'root',

            mode: '0740',

            source: 'fer://test_file.txt', // from fer server or http location
            text => 'Done.', // or raw text

            modify => [
              {
                search: /<[^>]+>/g,
                replace: '[\\1]'
              }
            ],

            command: function() {
              return fer.do(function(deferred) { // must
                // do something here
                deferred.resolve();
              });
            },
          },
        }
      }
   */
  function FileInstaller(config, callback) {
    var self = this;

    this.postInstallUpdates = function(file) {
      return fer.do(function(deferred) {
        var owner = file.owner || 'root';
        var group = file.group || 'root';
        var mode  = file.mode || '0750';

        fer.command(
          'chown {1}:{2} {3}'.format(
            owner,
            group,
            file.destination
          ),
          true
        ).then(function() {
          return fer.command(
            'chmod {1} {2}'.format(
              mode,
              file.destination
            ),
            true
          );
        }).then(function() {
          return fer.do(function(d1) {
            fer.FileUtils.fileSHA1AndMD5(
              file.destination
            ).then(function(sums) {
              fer.memory.set(
                'fer::file_install::{1}'.format(
                  file.destination
                ),
                sums
              );
              d1.resolve();
            });
          });
        }).then(function() {
          return fer.do(function(deferred) {
            fer.value(file.modify).then(function(mods) {
              if (typeof(mods) === 'undefined' || mods.length == 0) {
                return deferred.resolve();
              }

              var contents = fer.fs.readFileSync(file.destination).toString();
              fer.reduce(mods, function(value, offset, deferred) {
                contents = contents.replace(value.search, value.replace);
                deferred.resolve();
              }).then(function() {
                fer.fs.writeFileSync(file.destination, contents, 'utf8');
                deferred.resolve();
              });
            });
          });
        }).then(function() {
          fer.runModuleCommand(file.command).then(function(result) {
            deferred.resolve(result);
          });
        });
      });
    };

    fer.value(config).then(function(config) {
      if (typeof(config) !== 'object') {
        fer.log(0, 'Fer: !WARNING! I need a dictionary list for file_install. I cannot continue with this struct');
        return callback();
      }

      var files_to_install = [];
      fer.reduce(Object.keys(config), function(key, offset, deferred) {
        fer.do(function(_deferred) {
          config[key].destination = key;
          var install = config[key];
          fer.values(install, ['command', 'modify']).then(function(install) {
            var exists = fer.memory.get('fer::file_install::{1}'.format(key));
            try {
              fer.FileUtils.stat(install.destination).isFile();
            } catch (e) {
              exists = false;
            }
            if (exists) {
              // check to see if the record we have matches the record the
              // server currently has for this file.
              if (install.text) {
                // work out the md5 and sha1 and compare it to memory
                fer.value(install.text).then(function(string) {
                  var md5 = fer.md5(string);
                  var sha1 = fer.sha1(string);
                  if (exists.md5 != md5 || exists.sha1 != sha1) {
                    _deferred.resolve(install);
                  } else {
                    _deferred.resolve(false);
                  }
                });
              } else if (install.source) {
                var source = install.source;
                if (source.indexOf('fer://') > -1) {
                  // ask the server what the most recent md5 and sha1 is for
                  // this file.
                  var file = source.replace('fer://', '');
                  fer.server(
                    '/modules/file_install/check?source='+file,
                    true
                  ).then(function(response) {
                    var body = JSON.parse(response.body);
                    if (response.code !== 200 || !body) {
                      // server errored
                      return _deferred.resolve(false);
                    }

                    if (body.forEach) {
                      fer.log(0, '!WARNING! I cannot install directories from file_install. Please use dir_install.', 1);
                      return _deferred.resolve(false);
                    }

                    // Check to make sure that our records match the server
                    // records.
                    if (
                      body.md5 != exists.md5 ||
                      body.sha1 != exists.sha1
                    ) {
                      _deferred.resolve(install); // they don't match
                    } else {
                      _deferred.resolve(false); // they match
                    }
                  }).catch(function() {
                    _deferred.resolve();
                  });
                } else if (source.indexOf('http') > -1) {
                  // we can't get the information we need from an external
                  // source so we just have to install it anyway. :sadface:
                  _deferred.resolve(install);
                } else {
                  _deferred.resolve(false);
                  fer.log(0, "I don't know how to install from {1}".format(source), 2);
                }
              } else {
                fer.log(0, "!WARNING! I cannot install a file without a source or some text. Please refer to the documentation for file_install.", 2);
                return _deferred.resolve(false);
              }
            } else {
              _deferred.resolve(install);
            }
          });
        }).then(function(file_install) {
          if (file_install === false) {
            // records in memory must match what the server has so there's
            // no need to proceed.
          } else {
            files_to_install.push(file_install);
          }
          deferred.resolve();
        });
      }).then(function() {
        return fer.do(function(d0) {
          fer.log(5, 'Installing {1} files'.format(files_to_install.length), 1);
          fer.reduce(files_to_install, function(install, offset, deferred) {
            if (!install) {
              return deferred.resolve();
            }

            fer.log(5, "{1}".format(install.destination), 1);
            // we can proceed with installing the file from the source
            // provided.

            // but, first, we need to make sure the folder path exists
            mkdirp(fer.path.dirname(install.destination), function(err) {
              if (err) {
                console.error(err);
                return deferred.resolve();
              }
              // ok, now install it
              if (install.source) {
                if (install.source.indexOf('fer://') > -1) {
                  fer.log(5, 'Downloading source file from Fer server', 2);
                  var file = install.source.replace('fer://', '');
                  var url = '/get-file/?file='+file;
                  fer.server(url, true).then(function(response) {
                    fer.fs.writeFileSync(install.destination, response.body);
                    self.postInstallUpdates(install).then(function() {
                      deferred.resolve();
                    });
                  }).catch(function(e) {
                    console.log(e);
                    deferred.resolve();
                  });
                } else {
                  // assume http
                  fer.log(5, '!WARNING!', 2);
                  fer.log(5, '! Installing from the web: {1}'.format(install.source), 3);
                  fer.log(5, '! Downloading source file from the web is not advised for speed, stability and security reasons.', 3);
                  fer.requestify.get(install.source).then(function(response) {
                    response.getBody();
                    fer.fs.writeFileSync(install.destination, response.body);
                    self.postInstallUpdates(install).then(function() {
                      deferred.resolve();
                    });
                  }).fail(function() {
                    deferred.resolve();
                  });
                }
              } else if (install.text) {
                fer.fs.writeFileSync(install.destination, install.text);
                self.postInstallUpdates(install).then(function() {
                  deferred.resolve();
                });
              }
            });
          }).then(function() {
            d0.resolve();
          });
        });
      }).then(function() {
        callback();
      });
    });
  }

  return FileInstaller;
}());

module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/file_install.md').toString();
  },
  run_at: function() {
    return fer.base_run_at + 400;
  },
  cls: FileInstaller
};