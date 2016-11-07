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
          var commands = [];
          if (!fer.FileUtils.directoryExists(path)) {
            fer.log(0, 'Installing {1}'.format(config.source), 1);
            commands = [
              'git clone {1} {2}'.format(config.source, path),
              'cd {1}'.format(path),
              'git checkout {1}'.format(config.branch)
            ];
          } else {
            fer.log(0, 'Updating {1}'.format(config.source), 1);
            commands = [
              'cd {1}'.format(path),
              'git checkout {1}'.format(config.branch),
              'git pull --all -q',
            ];
          }
          fer.command(commands, false, config.run_as).then(function() {
            fer.value(config.command).then(function() {
              deferred.resolve();
            });
          });
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
      return fer.fs.readFileSync(__dirname + '/../help/git.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 600;
    },
    cls: Git
  };
}());
