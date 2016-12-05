/* global fer */
var EnvironmentVariables = (function() {
  /**
   *
   * Example:
       {
        environment: {
          '/etc/environment': {
            PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games',
          },
        }
      }
   */
  function EnvironmentVariables(config, callback) {
    var self = this;
    if (!fer.$$environment) {
      fer.$$environment = {};
      fer.on('beforeDone', function() {
        var start = (new Date()).getTime();
        fer.log(0, 'beforeDone-environment> Starting', 0);
        return fer.do(function(deferred) {
          config = fer.$$environment;
          fer.reduce(Object.keys(fer.$$environment), function(fileName, offset, _deferred) {
            fer.value(config[fileName], ['command']).then(function(config) {
              var entries = [];
              Object.keys(config).forEach(function(key) {
                entries.push('{1}="{2}"'.format(key, config[key]));
              });

              fer.writeWithFileWarning(fileName, entries).then(function() {
                _deferred.resolve();
              });
            }).fail(function(e) {
              console.log(e);
              _deferred.resolve();
            });
          }).then(function() {
            var ms = (new Date()).getTime() - start;
            fer.log(0, 'beforeDone-environment> Completed in {1}ms'.format(ms), 0);
            deferred.resolve();
          }).fail(function(e) {
            console.log(e);
            deferred.resolve();
          });
        });
      });
    }

    if (typeof(config) !== 'object') {
      fer.log(0, 'Fer: !WARNING! I need a dictionary list for environment. I cannot continue with this struct');
      return callback();
    }
    fer.config_merge_left(fer.$$environment, config).then(function(config) {
      fer.$$environment = config;
      callback();
    });

    return self;
  }

  return EnvironmentVariables;
}());

module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/environment.md').toString();
  },
  run_at: function() {
    return fer.base_run_at + 2;
  },
  cls: EnvironmentVariables
};