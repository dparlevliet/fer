/* global fer */
module.exports = (function() {
  /**
   *
   * Example:
      file_ensure: {
        '/tmp/test': {
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
  function FileEnsure(config, callback) {
    fer.value(config).then(function(config) {
      if (typeof(config) !== 'object') {
        fer.log(0, 'Fer: !WARNING! I need a dictionary list for file_ensure. I cannot continue with this struct');
        return callback();
      }

      fer.reduce(Object.keys(config), function(key, offset, deferred) {
        var install_config = config[key];
        config[key].destination = key;
        fer.values(install_config, ['command']).then(function(config) {
          var mode    = config.mode || '0740';
          var owner   = config.owner || 'root';
          var group   = config.group || 'root';
          var dir     = fer.path.dirname(config.destination);
          fer.mkdirp(dir, function(err) {
            if (err) {
              console.error(err);
              return deferred.resolve();
            }
            try {
              fer.FileUtils.stat(key).isFile(); // will error if not
            } catch (e) {
              fer.fs.writeFileSync(key, '');
            }
            fer.command(
              'chmod {1} {2}'.format(
                mode,
                config.destination
              ),
              true
            ).then(function() {
              return fer.command(
                'chown {1}:{2} {3}'.format(
                  owner,
                  group,
                  config.destination
                ),
                true
              );
            }).then(function() {
              fer.runModuleCommand(config.command).then(function() {
                deferred.resolve();
              });
            });
          });
        }).fail(function(e) {
          console.log(e);
          deferred.resolve();
        });
      }).then(function() {
        callback();
      });
    });
  } // FileEnsure

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/file_ensure.md').toString();
    },
    run_at: function() {
      return fer.base_run_at + 1200;
    },
    cls: FileEnsure
  };
}());