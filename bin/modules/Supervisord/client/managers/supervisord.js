/* global fer */

module.exports = (function() {

  /**
    Example:
    {
      supervisord: {
        'app_name': {
          command: 'nodejs /root/fer/fer-server.js',
          user: 'fer',
          autostart: true,
          autorestart: true,
          process_name: '%(program_name)s',
          stopsignal: 'QUIT',
          stderr_logfile: '/var/log/fer-server.log',
          stdout_logfile: '/var/log/fer-server.log',
          environment: {
            PATH: '/bin/bash',
          }
        },
      },
    }
   */

  function Supervisord(config, callback) {
    if (!fer.$$supervisord) {
      fer.$$supervisord = {};
      fer.on('beforeDone', function() {
        var start = (new Date()).getTime();
        fer.log(0, 'beforeDone-supervisord> Starting', 0);
        return fer.do(function(deferred) {
          config = fer.$$supervisord;
          // install apps
          fer.reduce(Object.keys(config), function(appName, index, deferred) {
            fer.value(config[appName]).then(function(config) {
              var environmentVariables = [];
              if (config.environment) {
                Object.keys(config.environment).forEach(function(key) {
                  environmentVariables.push('{1}={2}'.format(key, config.environment[key]));
                });
              }
              fer.fs.writeFileSync('/etc/supervisor/conf.d/{1}.conf'.format(appName), [
                '###################################',
                '# Installed by Fer                #',
                '###################################',
                '# !WARNING!                       #',
                '# DO NOT MANUALLY EDIT THIS FILE! #',
                '###################################',
                '',
                '[program:{1}]'.format(appName),
                'command={1}'.format(config.command),
                'autostart={1}'.format((config.autostart)?'true':'false'),
                'autorestart={1}'.format((config.autorestart)?'true':'false'),
                'stderr_logfile={1}'.format((config.stderr_logfile)?config.stderr_logfile:'/var/log/{1}.log'.format(appName)),
                'stdout_logfile={1}'.format((config.stdout_logfile)?config.stdout_logfile:'/var/log/{1}.log'.format(appName)),
                'process_name: {1}'.format((config.process_name)?config.process_name:'%(program_name)s'),
                'stopsignal={1}'.format((config.process_name)?config.stopsignal:'QUIT'),
                ((config.user)?'user={1}'.format(config.user):''),
                ((config.environment)?'environment={1}'.format(environmentVariables.join(',')):''),
              ].join("\n")+"\n");
              deferred.resolve();
            });
          }).then(function(lines) {
            var appStarts = [];
            Object.keys(config).forEach(function(appName) {
              appStarts.push('supervisorctl start {1}'.format(appName));
            });
            fer.command([
              '/etc/init.d/supervisor start',
              'supervisorctl reread',
              'supervisorctl update',
            ].concat(appStarts), false).then(function() {
              var ms = (new Date()).getTime() - start;
              fer.log(0, 'beforeDone-supervisord> Completed in {1}ms'.format(ms), 0);
              deferred.resolve();
            });
          }).fail(function(e) {
            console.log(e);
            deferred.resolve();
          });
        });
      });
    }
    fer.config_merge_left(fer.$$supervisord, config).then(function(config) {
      fer.$$supervisord = config;
      callback();
    });
  } // Supervisord

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/supervisor.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 4;
    },
    cls: Supervisord
  };
}());