/* global fer */
var mkdirp = require('mkdirp');


module.exports = (function() {
  /**
   *
   * Example:
      dir_ensure: {
        '/tmp/test': {
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
  function DirEnsure(config, callback) {
    fer.value(config).then(function(config) {
      if (typeof(config) !== 'object') {
        fer.log(0, 'Fer: !WARNING! I need a dictionary list for file_ensure. I cannot continue with this struct');
        return callback();
      }

      Object.keys(config).reduce(function(previous, key, offset) {
        return previous.then(function() {
          return fer.do(function(d0) {
            fer.do(function(d1) {
              var install_config = config[key];
              config[key].destination = key;
              fer.values(install_config, ['command']).then(function(config) {
                var dir_mode    = config.dir_mode || '0750';
                var owner       = config.owner || 'root';
                var group       = config.group || 'root';
                mkdirp(key, function(err) {
                  if (err) {
                    console.error(err);
                    d1.resolve();
                  } else {
                    fer.command(
                      'chmod {1} {2}'.format(
                        dir_mode,
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
                        d1.resolve();
                      });
                    });
                  }
                });
              });
            }).then(function() {
              d0.resolve();
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
      return fer.fs.readFileSync(__dirname + '/../help/dir_ensure.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 300;
    },
    cls: DirEnsure
  };
}());