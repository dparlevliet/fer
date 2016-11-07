/* global fer */

module.exports = (function() {
  /**
   *
   * Example:
      dir_install: {
        '/tmp/test': {
          source: 'fer://test',
          dir_mode: '0750',
          mode: '0640',
          owner: 'root',
          group: 'root',
          command: function() {
            return fer.do(function(deferred) {
              // do something here
              deferred.resolve();
            });
          },
        }
      }
   */
  function DirInstaller(config, callback) {
    var self = this;

    this.postInstallUpdates = function(path_config) {
      return fer.do(function(deferred) {
        var dir_mode    = path_config.config.dir_mode || '0750';
        var file_mode   = path_config.config.mode || '0640';
        var owner       = path_config.config.owner || 'root';
        var group       = path_config.config.group || 'root';
        fer.command(
          'find {2} -type d -exec chmod {1} {} +'.format(
            dir_mode,
            path_config.config.destination
          ),
          true
        ).then(function() {
          return fer.command(
            'find {2} -type f -exec chmod {1} {} +'.format(
              file_mode,
              path_config.config.destination
            ),
            true
          );
        }).then(function() {
          return fer.command(
            'chown -R {1}:{2} {3}'.format(
              owner,
              group,
              path_config.config.destination
            ),
            true
          );
        }).then(function() {
          fer.value(path_config.config.command).then(function() {
            deferred.resolve();
          });
        });
      });
    };

    fer.value(config).then(function(config) {
      if (typeof(config) !== 'object') {
        fer.log(0, 'Fer: !WARNING! I need a dictionary list for dir_install. I cannot continue with this struct');
        return callback();
      }

      Object.keys(config).reduce(function(previous, key, offset) {
        return previous.then(function() {
          return fer.do(function(d0) {
            fer.do(function(d1) {
              var install_config = config[key];
              config[key].destination = key;
              fer.values(install_config, ['command']).then(function(install) {
                var source = install.source;
                if (source.indexOf('fer://') > -1) {
                  // ask the server what the most recent md5 and sha1 is for
                  // this file.
                  var folder = source.replace('fer://', '');
                  fer.server(
                    '/modules/dir_install/check?source='+folder,
                    true
                  ).then(function(response) {
                    var body = JSON.parse(response.body);
                    if (response.code !== 200 || !body) {
                      return d1.resolve(false);
                    }

                    // handle any sub folders/files that might need to be installed
                    if (body.forEach) {
                      var found = [];
                      // it's a directory so we need go through all of the
                      // files and compare each file.
                      body.reduce(function(previous, details, offset) {
                        return previous.then(function() {
                          return fer.do(function(deferred) {
                            if (details.type !== 'file') {
                              return deferred.resolve();
                            }

                            // carry forward variables that might need to be used
                            details.install_destination = install.destination;
                            details.destination_path = '{1}/{2}'.format(
                              install.destination,
                              details.path
                            );
                            details.source_folder = folder;
                            details.destination_folder = fer.path.dirname(details.destination_path);

                            if (fer.FileUtils.fileExists(details.destination_path)) {
                              fer.FileUtils.fileSHA1AndMD5(
                                details.destination_path
                              ).then(function(sums) {
                                if (sums.md5 != details.md5 || sums.sha1 != details.sha1) {
                                  found.push(details);
                                }
                                deferred.resolve();
                              });
                            } else {
                              found.push(details);
                              deferred.resolve();
                            }
                          });
                        });
                      }, fer.do(function(d9) {
                        d9.resolve();
                      })).then(function() {
                        // if we found any files that we need we need to pass
                        // them on. We don't want to waste time, b/w and
                        // resources downloading stuff that we didn't need.
                        if (found.length > 0) {
                          install.partials = found;
                          install.config = install_config;
                          d1.resolve(install);
                        } else {
                          d1.resolve(false);
                        }
                      });
                    } else {
                      d1.resolve(false);
                    }
                  }).catch(function() {
                    d1.resolve();
                  });
                } else {
                  d1.resolve(false);
                  fer.log(0, "I don't know how to install from {1}".format(source), 2);
                }
              });
            }).then(function(file_install) {
              if (file_install === false) {
                // records in memory must match what the server has so there's
                // no need to proceed.
                d0.resolve();
              } else {
                fer.log(1, '{1}'.format(file_install.destination), 1);
                fer.log(1, 'Installing {1} files'.format(file_install.partials.length), 2);
                fer.reduce(file_install.partials, function(details, offset, deferred) {
                  fer.mkdirp(details.destination_folder, function (err) {
                    if (err) {
                      console.error(err);
                      deferred.resolve();
                    } else {
                      fer.log(5, 'Downloading: {1}'.format(details.destination_path), 3);
                      fer.server(
                        '/get-file/?file={1}'.format(
                          details.path
                        ), true
                      ).then(function(response) {
                        response.getBody();
                        if (response.code == 200) {
                          fer.log(5, 'Installing: {1}'.format(details.destination_path), 3);
                          fer.fs.writeFileSync(details.destination_path, response.body);
                        }
                        deferred.resolve();
                      });
                    }
                  });
                }).then(function() {
                  self.postInstallUpdates(file_install).then(function() {
                    d0.resolve();
                  });
                });
                /*
                file_install.partials.reduce(function(previous, details, offset) {
                  return previous.then(function() {
                    return fer.do(function(deferred) {
                      fer.mkdirp(details.destination_folder, function (err) {
                        if (err) {
                          console.error(err);
                          deferred.resolve();
                        } else {
                          fer.log(5, 'Downloading: {1}'.format(details.destination_path), 3);
                          fer.server(
                            '/get-file/?file=files/{1}/{2}'.format(
                              details.source_folder,
                              details.path
                            ), true
                          ).then(function(response) {
                            response.getBody();
                            if (response.code == 200) {
                              fer.log(5, 'Installing: {1}'.format(details.destination_path), 3);
                              fer.fs.writeFileSync(details.destination_path, response.body);
                            }
                            deferred.resolve();
                          });
                        }
                      });
                    });
                  });
                }, fer.do(function(d0) {
                  d0.resolve();
                })).then(function() {
                  self.postInstallUpdates(file_install).then(function() {
                    d0.resolve();
                  });
                });
                */
              }
            });
          });
        });
      }, fer.do(function(d0) {
        d0.resolve();
      })).then(function() {
        callback();
      });
    });
  }

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/dir_install.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 400;
    },
    cls: DirInstaller
  };
}());