/* global fer */

var Apt = (function() {

  /**
   * Example:
     apt: {
        run_at: 801,
        always_update: false,
        always_upgrade: false,
        deb_options: [
          "mariadb-server-5.5 mysql-server/root_password password asdf",
        ],
        packages: [
          'mariadb-server-5.5',
        ],
        purge: [
          'mariadb-server-5.1',
        ],
        remove: [
          'mariadb-server-5.1',
        ],
      }
  */

  function Apt(config, callback) {
    var lines               = 0;
    var existing_packages   = [];
    var new_packages        = [];

    fer.value(config).then(function(config) {
      if (!config) {
        return callback();
      }
      // find installed packages
      return fer.command('dpkg -l', true);
    }).then(function(response) {
      return fer.do(function(deferred) {
        // process installed packages
        lines = response.contents.split(fer.os.EOL);

        // find existing INSTALLED packages
        lines.forEach(function(line) {
          var parts = line.split(/\s+/);

          // Note: ii means installed
          if (parts.length >= 6 && parts[0] === 'ii') {
            existing_packages.push(parts[1]);
          }
        });

        // find any new packages
        if (config.packages) {
          config.packages.forEach(function(pkg) {
            if (existing_packages.indexOf(pkg) == -1) {
              new_packages.push(pkg);
            }
          });
        }

        deferred.resolve();
      });
    }).then(function() {
      // update packages list
      return fer.do(function(deferred) {
        fer.value(config.always_update).then(function(value) {
          var memoryKey = 'fer::modules::PackageManagers::apt::lastUpdate';
          var lastUpdate = fer.memory.get(memoryKey);
          var now = (new Date()).getTime();
          if (
            (new_packages.length > 0 || value == true) ||
            (!lastUpdate || (now - Number(lastUpdate)) > (60*60*24*1000))
          ) {
            fer.memory.set(memoryKey, now);
            fer.command('apt-get -q update --fix-missing').then(function() {
              deferred.resolve();
            });
          } else {
            deferred.resolve();
          }
        });
      });
    }).then(function() {
      // install new packages
      return fer.do(function(deferred) {
        if (new_packages.length > 0) {
          fer.value(config.deb_options).then(function(options) {
            function run(options) {
              if (!options) {
                options = [];
              }
              fer.command(
                options.concat([
                  "export DEBIAN_FRONTEND=noninteractive",
                  "apt-get {1} {2} {3} {4} {5} {6} {7}".format(
                    "-q",
                    "-o StopOnError=false",
                    "-o DPkg::Options=\"--force-confold\"",
                    "--force-yes -y",
                    "--allow-unauthenticated",
                    "install",
                    new_packages.join(' ')
                  )
                ])
              ).then(function(response) {
                deferred.resolve();
              });
            }

            if (options && new_packages.length > 0) {
              var deb_options = [];
              fer.reduce(options, function(option, offset, _deferred) {
                deb_options.push('debconf-set-selections <<< "{1}"'.format(option));
                _deferred.resolve();
              }).then(function() {
                run(deb_options);
              });
            } else {
              run();
            }
          });
        } else {
          deferred.resolve();
        }
      });
    }).then(function() {
      // update existing packages
      return fer.do(function(deferred) {
        fer.value(config.always_upgrade).then(function(value) {
          var memoryKey = 'fer::modules::PackageManagers::apt::lastUpgrade';
          var lastUpgrade = fer.memory.get(memoryKey);
          var now = (new Date()).getTime();
          if (
            (value == true) ||
            (!lastUpgrade || (now - Number(lastUpgrade)) > (60*60*24*1000))
          ) {
            fer.memory.set(memoryKey, now);
            fer.command(
              " apt-get {1} {2} {3} {4} {5}".format(
                "upgrade",
                "-oStopOnError=false",
                "-oDPkg::Options=\"--force-confold\"",
                "--force-yes -y",
                "--allow-unauthenticated"
              )
            ).then(function(code) {
              deferred.resolve();
            });
          } else {
            deferred.resolve();
          }
        });
      });
    }).then(function() {
      // remove any packages
      return fer.do(function(deferred) {
        fer.value(config.remove).then(function(remove) {
          if (remove && remove.length > 0) {
            fer.command(
              "apt-get remove {1} {2} {3}".format(
                "-oStopOnError=false",
                "--force-yes -y",
                remove.join(' ')
              )
            ).then(function(code) {
              deferred.resolve();
            });
          } else {
            deferred.resolve();
          }
        });
      });
    }).then(function() {
      // purge any packages
      return fer.do(function(deferred) {
        fer.value(config.purge).then(function(purge) {
          if (purge && purge.length > 0) {
            fer.command(
              "apt-get remove --purge {1} {2} {3}".format(
                "-oStopOnError=false",
                "--force-yes -y",
                purge.join(' ')
              )
            ).then(function(code) {
              deferred.resolve();
            });
          } else {
            deferred.resolve();
          }
        });
      });
    }).then(function() {
      callback();
    });
  } // Apt

  return Apt;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/apt.md').toString();
  },
  run_at: function() {
    return fer.base_run_at + 100;
  },
  cls: Apt
};