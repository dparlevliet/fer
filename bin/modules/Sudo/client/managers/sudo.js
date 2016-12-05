/* global fer */

module.exports = (function() {

  /**
    Example:
    {
      sudo: {
        config: [
          'Defaults env_reset',
          'Defaults mail_badpass',
          'Defaults secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"',
          '',
          '#includedir /etc/sudoers.d',
        ],
        sudoers: {
          'root': ['ALL'],
          '%admin': ['ALL'],
          '%sudo': ['ALL'],
          '%wheel': ['ALL'],
        },
      },
    }
   */

  function Sudo(config, callback) {
    if (!fer.$$sudo) {
      fer.$$sudo = {};
      fer.on('beforeDone', function() {
        return fer.do(function(deferred) {
          config = fer.$$sudo;
          var start = (new Date()).getTime();
          fer.log(0, 'beforeDone-sudo> Starting', 0);
          fer.value(config.config).then(function(configLines) {
            if (!configLines) {
              configLines = [];
            }
            fer.value(config.sudoers).then(function(sudoers) {
              fer.reduce(Object.keys(sudoers), function(sudoer, offset, deferred) {
                configLines.push('{1} ALL=(ALL) {2}'.format(sudoer, sudoers[sudoer].join(", ")));
                deferred.resolve();
              }).then(function() {
                fer.FileUtils.readlines('/etc/sudoers').then(function(originalLines) {
                  fer.log(0, 'Writing sudoers file', 1);
                  fer.fs.writeFileSync('/etc/sudoers', [
                    '###################################',
                    '# Installed by Fer                #',
                    '###################################',
                    '# !WARNING!                       #',
                    '# DO NOT MANUALLY EDIT THIS FILE! #',
                    '###################################',
                    '',
                  ].concat(configLines).join("\n")+"\n");
                  fer.command('visudo -c', false).then(function(response) {
                    if (response.code != 0) {
                      fer.log(0, '!WARNING! visudo reported an error in the sudoers config! Reverting back to previous version', 2);
                      fer.fs.writeFileSync('/etc/sudoers', originalLines.join("\n")+"\n");
                    }
                    deferred.resolve();
                    var ms = (new Date()).getTime() - start;
                    fer.log(0, 'beforeDone-sudo> Completed in {1}ms'.format(ms), 0);
                  });
                });
              }).fail(function(e) {
                console.log(e);
                deferred.resolve();
              });
            });
          });
        });
      });
    }
    fer.config_merge_left(fer.$$sudo, config).then(function(config) {
      fer.$$sudo = config;
      callback();
    });
  } // Sudo

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/sudo.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 2;
    },
    cls: Sudo
  };
}());