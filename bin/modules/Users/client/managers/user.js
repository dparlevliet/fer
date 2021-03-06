/* global fer */
var bin = require('../bin/index.js');
var Groups = bin.Groups;
var Users = bin.Users;

/**
  {
     user: {
      testuser: {
        name: "Full User Name",
        uid: 1000,
        gid: 1000,
        groups: ["testgroup", "wheel"],
        password: '12345',          # Preferably specify a MD5 encoded password instead of plaintext
        force_password: true,       # Reset the password if it's changed on the system
        home: "/home/testuser",     # Create home directory here
        shell: "/bin/bash",
        ssh_keys: ["testuser"],
        homedir_mode: 0750,
      },
      baduser: null,  # Remove this user
    }
  }
 */
var UserConfig = (function() {
  function UserConfig(config, callback) {
    fer.value(config).then(function(config) {
      fer.reduce(Object.keys(config), function(uname, offset, deferred) {
        fer.log(2, 'Handling configuration for {1}'.format(uname), 1);
        fer.value(config[uname]).then(function(config) {
          if (config === null) {
            fer.log(3, 'Ensuring that {1} is deleted'.format(uname), 2);
            return Users.delete(uname).then(function() {
              deferred.resolve();
            });
          }

          fer.log(3, 'Looking for groups to create', 2);
          fer.do(function(_deferred) {
            if (config.groups) {
              fer.value(config.groups).then(function(groups) {
                fer.reduce(groups, function(group, offset, _deferred) {
                  Groups.check_exists(group).then(function(exists) {
                    if (exists) {
                      return _deferred.resolve();
                    }
                    fer.log(0, 'Creating group {1}'.format(group), 3);
                    Groups.create(group).then(function() {
                      _deferred.resolve();
                    });
                  });
                }).then(function() {
                  _deferred.resolve();
                });
              });
            } else {
              fer.log(3, 'No usable groups found', 3);
              _deferred.resolve();
            }
          }).then(function() {
            fer.log(3, 'Checking to see if {1} needs to be created.'.format(uname), 2);
            return fer.do(function(_deferred) {
              // does this user belong to the groups we need it to belong to?
              Users.check_exists(uname).then(function(exists) {
                if (!exists) {
                  fer.log(0, 'Creating user {1}'.format(uname), 3);
                  Users.create(uname, config[uname]).then(function() {
                    _deferred.resolve();
                  });
                } else {
                  fer.log(3, 'Not creating {1}'.format(uname), 3);
                  _deferred.resolve();
                }
              });
            });
          }).then(function() {
            return fer.do(function(deferred) {
              // check to see if we should modify the user at all
              var userInfo = fer.posix.getpwnam(uname);
              if (
                userInfo.shell != config.shell ||
                userInfo.passwd != config.passwd ||
                userInfo.dir != config.home ||
                userInfo.uid != config.uid ||
                userInfo.gid != config.gid
              ) {
                Users.update(uname, config).then(function() {
                  deferred.resolve();
                });
              } else {
                deferred.resolve();
              }
            });
          }).then(function() {
            return fer.do(function(deferred) {
              if (config.homedir_mode) {
                var userInfo = fer.posix.getpwnam(uname);
                fer.command(
                  'chmod {1} {2}'.format(config.homedir_mode, userInfo.dir)
                ).then(function() {
                  deferred.resolve();
                });
              } else {
                deferred.resolve();
              }
            });
          }).then(function() {
            return fer.do(function(deferred) {
              // install ssh keys
              fer.value(config.ssh_keys).then(function(ssh_keys) {
                if (!ssh_keys || !ssh_keys.forEach) {
                  return deferred.resolve();
                }
                fer.log(2, 'Installing SSH keys', 2);
                fer.reduce(ssh_keys, function(key, offset, deferred) {
                  Users.install_ssh_key(uname, key).then(function() {
                    deferred.resolve();
                  });
                }).then(function() {
                  deferred.resolve();
                });
              });
            });
          }).then(function() {
            fer.log(2, "Done setting up " + uname, 1);
            deferred.resolve();
          });
        });
      }).then(function() {
        callback();
      });
    });
  }

  return UserConfig;
}());

module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/users.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 200;
  },
  cls: UserConfig,
};