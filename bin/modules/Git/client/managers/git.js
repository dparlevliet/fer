/* global fer */

module.exports = (function() {

  /**
    Example:
      {
        git: {
          '/root/fer': {
            'source': 'https://www.github.com/dparlevliet/fer.git',
            'branch': 'master',
            'run_as': 'www-data',
            'command': function() {
              return fer.do(function(deferred) {
                return deferred.resolve();
              });
            }
          },
        },
      }
   */

  function Git(config, callback) {
    if (!fer.FileUtils.fileExists('/usr/bin/git')) {
      fer.log(0, '!WARNING! Git is not installed. Please install it first', 1);
      return callback();
    }
    fer.reduce(Object.keys(config), function(path, offset, deferred) {
      fer.mkdirp(fer.path.dirname(path), function(err) {
        if (err) {
          console.error(err);
          return deferred.resolve();
        }
        fer.value(config[path], ['command']).then(function(config) {
          if (!fer.FileUtils.directoryExists(path)) {
            fer.log(0, 'Installing {1}'.format(config.source), 1);
            fer.command([
              'git clone {1} {2}'.format(config.source, path),
              'cd {1}'.format(path),
              'git checkout {1}'.format(config.branch)
            ], false, config.run_as).then(function() {
              fer.runModuleCommand(config.command).then(function() {
                deferred.resolve();
              });
            });
          } else {
            fer.command([
              'cd {1}'.format(path),
              'git status -uno'
            ], true).then(function(response) {
              if (response.contents.search(/up\-to\-date/g) === -1) {
                fer.log(0, 'Updating {1}'.format(config.source), 1);
                fer.command([
                  'cd {1}'.format(path),
                  'git checkout {1}'.format(config.branch),
                  'git pull --all -q',
                ]).then(function() {
                  fer.runModuleCommand(config.command).then(function() {
                    deferred.resolve();
                  });
                });
              } else {
                fer.log(0, '{1} up-to-date'.format(config.source), 1);
                deferred.resolve();
              }
            });
          }
        });
      });
    }).then(function() {
      callback();
    }).fail(function(e) {
      console.log(e);
      callback();
    });
  } // Git

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/git.md').toString();
    },
    run_at: function() {
      return fer.base_run_at + 600;
    },
    cls: Git
  };
}());
