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
    var existing_packages   = [];
    var new_packages        = [];

    fer.value(config).then(function(config) {
      if (!config) {
        return callback();
      }

      // find installed packages
      return fer.do(function(deferred) {
        // Crudely parse ``/var/lib/dpkg/status`` so that we can support
        // virtual packages. This should prevent Fer from constantly trying to
        // install a package that're actually already installed but listed in
        // ``dpkg -l`` as a new or slightly different name.
        //
        // eg. ``php5.6-cli`` might be changed to ``php5-cli`` depending on the
        // provider - apt will handle this automatically and now Fer should too.
        try {
          fer.FileUtils.readlines('/var/lib/dpkg/status').then(function(lines) {
            var installedPackages = {};
            var lastPackage = '';
            var lastPackageInstalled = false;
            lines.forEach(function(line, offset) {
              var parts;
              if (line.indexOf('Package') > -1) {
                parts = line.split(' ');
                lastPackage = parts[1].trim();
                lastPackageInstalled = false;
              }
              if (line.indexOf('Status: install ok installed') > -1) {
                lastPackageInstalled = true;
                installedPackages[lastPackage] = true;
              }
              if (line.indexOf('Provides:') > -1 && lastPackageInstalled) {
                parts = line.split(':');
                var packages = parts[1].split(', ');
                packages.forEach(function(pkg) {
                  installedPackages[pkg.trim()] = true;
                });
              }
            });
            fer.reduce(config.packages, function(packageName, offset, _deferred) {
              if (typeof(installedPackages[packageName]) !== 'undefined') {
                existing_packages.push(packageName);
              } else {
                new_packages.push(packageName);
              }
              _deferred.resolve();
            }).then(function() {
              deferred.resolve();
            });
          });
        } catch (e) {
          console.log(e);
          deferred.resolve();
        }
      });
    }).then(function() {
      // update packages list
      return fer.do(function(deferred) {
        fer.value(config.ppa).then(function(value) {
          var memoryKey = 'fer::modules::PackageManagers::apt::ppa';
          var lastInstall = fer.memory.get(memoryKey) || [];
          if (
            typeof(value) === 'object' && value.forEach && value.length > 0
          ) {
            var changed = false;
            fer.reduce(value, function(ppa, offset, _deferred) {
              if (lastInstall.indexOf(ppa) === -1) {
                changed = true;
                fer.command(
                  'DEBIAN_FRONTEND=noninteractive add-apt-repository -y ppa:{1}'.format(ppa)
                ).then(function() {
                  _deferred.resolve();
                });
              } else {
                _deferred.resolve();
              }
            }).then(function() {
              fer.memory.set(memoryKey, value);
              deferred.resolve(changed);
            });
          } else {
            deferred.resolve();
          }
        });
      });
    }).then(function(forceInstall) {
      // update packages list
      return fer.do(function(deferred) {
        fer.value(config.always_update).then(function(value) {
          var memoryKey = 'fer::modules::PackageManagers::apt::lastUpdate';
          var lastUpdate = fer.memory.get(memoryKey);
          var now = (new Date()).getTime();
          if (
            (new_packages.length > 0 || value == true) || forceInstall ||
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
                    "-o Dpkg::Options=\"--force-confold\"",
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
                "-oDpkg::Options=\"--force-confold\"",
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
    }).fail(function(e) {
      console.log(e);
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