/* global fer */

var Groups = (function() {

  function Groups() {
    var parent = this;

    parent.check_exists = function(name) {
      return fer.do(function(deferred) {
        fer.command(
          'grep -i "^{1}:" /etc/group | wc -l'.format(name),
          true
        ).then(function(response) {
          if (response.contents.trim() === '1') {
            return deferred.resolve(true);
          }
          return deferred.resolve(false);
        });
      });
    };

    parent.create = function(name, options) {
      return fer.do(function(deferred) {
        fer.command(
          [
            'groupadd',
            ((options&&options.gid) ? "-g '{1}' -f".format(options.gid) : ''),
            name
          ].join(' '),
          true
        ).then(function(response) {
          deferred.resolve();
        });
      });
    };
  }

  return new Groups();
}());


var Users = (function() {

  function Users() {
    var parent = this;

    parent.check_exists = function(name) {
      return fer.do(function(deferred) {
        fer.command(
          'grep -i "^{1}:" /etc/passwd | wc -l'.format(name),
          true
        ).then(function(response) {
          if (response.contents.trim() == '1') {
            return deferred.resolve(true);
          }
          return deferred.resolve(false);
        });
      });
    };

    parent.create = function(name, options) {
      return fer.do(function(deferred) {
        var run = function(commands) {
          fer.command(
            commands.join(' '),
            true
          ).then(function(response) {
            deferred.resolve();
          });
        };

        var commands = [
          'useradd -m {1}'.format(name),
        ];

        if (options) {
          fer.values(options).then(function(options) {
            run(commands.concat([
              ((options.uid) ? "-u '{1}'".format(options.uid) : ""),
              ((options.gid) ? "-g '{1}'".format(options.gid) : ""),
              ((options.groups) ? "-G '{1}'".format(options.groups.join(",")) : ""),
              ((options.home) ? "-d '{1}'".format(options.home) : "-d /home/{1}".format(name)),
              ((options.name) ? "-c '{1}'".format(options.name) : ""),
              ((options.password) ? "-p '{1}'".format(options.password) : "!"),
              ((options.shell) ? "-s '{1}'".format(options.shell) : "/bin/false"),
            ]));
          });
        } else {
          run(commands);
        }
      });
    };

    parent.update = function(uname, options) {
      return fer.do(function(deferred) {
        var run = function(commands) {
          fer.command(
            commands.join(' '),
            false
          ).then(function(response) {
            deferred.resolve();
          });
        };

        if (options) {
          fer.log(2, 'Updating user', 2);
          fer.values(options).then(function(options) {
            run([
              'usermod',
              ((options.uid) ? "-u '{1}'".format(options.uid) : ""),
              ((options.gid) ? "-g '{1}'".format(options.gid) : ""),
              ((options.groups) ? "-G '{1}'".format(options.groups.join(",")) : ""),
              ((options.home) ? "-d '{1}'".format(options.home) : "-d /home/{1}".format(uname)),
              ((options.name) ? "-c '{1}'".format(options.name) : ""),
              ((options.password) ? "-p '{1}'".format(options.password) : "!"),
              ((options.shell) ? "-s '{1}'".format(options.shell) : "/bin/false"),
              uname,
            ]);
          });
        } else {
          deferred.resolve();
        }
      });
    };

    parent.install_ssh_key = function(uname, key) {
      return fer.do(function(deferred) {
        fer.log(2, 'Installing {1} for {2}'.format(key, uname), 3);
        var userInfo = fer.posix.getpwnam(uname);
        var sshPath = '{1}/.ssh/'.format(userInfo.dir);
        fer.mkdirp(sshPath, function (err) {
          if (err) {
            console.log('Error creating .ssh folder', err);
            return deferred.resolve();
          }
          var authorizedKeysPath = '{1}/authorized_keys'.format(sshPath);
          if (!fer.FileUtils.fileExists(authorizedKeysPath)) {
            fer.fs.writeFileSync(authorizedKeysPath, '');
          }
          fer.reduce([
            'chown {1}:{2} {3}'.format(uname, uname, authorizedKeysPath),
            'chmod 444 {1}'.format(authorizedKeysPath),
          ], function(command, offset, deferred) {
            fer.command(command, true).then(function() {
              deferred.resolve();
            });
          }).then(function() {
            fer.FileUtils.readlines(
              authorizedKeysPath
            ).then(function(lines) {
              var newLines = [];
              fer.reduce(lines, function(line, offset, deferred) {
                if (line.indexOf(key) == -1 && line.length > 0) {
                  newLines.push(line);
                }
                deferred.resolve();
              }).then(function() {
                fer.server(
                  '/modules/user/get-public-key/?key='+key,
                  true
                ).then(function(response) {
                  response.getBody();
                  if (response.code !== 200) {
                    fer.log('!WARNING! Public SSH key for ({1}) not found in configuration file.'.format(key));
                  } else {
                    newLines.push(response.body);
                  }
                  fer.fs.writeFileSync(authorizedKeysPath, newLines.join("\n")+"\n", 'utf-8');
                  deferred.resolve();
                }).catch(function() {
                  fer.log('!WARNING! Public SSH key for ({1}) not found in configuration file.'.format(key));
                  deferred.resolve();
                });
              });
            });
          });
        });
      });
    };

    parent.delete = function(uname) {
      return fer.command('userdel -r {1}'.format(uname));
    };
  }

  return new Users();
}());


module.exports = {
  'Groups': Groups,
  'Users': Users,
};