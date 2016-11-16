/* global fer */

var Logrotate = (function() {

  /**
    Example:
    {
      logrotate: {
        '/var/log/auth.log': {
          daily: true,  // Could be daily, monthly, weekly, yearly
          compress: 3,
          missingok: true,
          notifempty: true,
          delaycompress: true,
          sharedscripts: true,
          rotate: 10,
          size: '10M',
          create: '0700 root root',
          postrotate: "ls -l /var/log/foo.* > /tmp/foologfiles",
          prerotate: "ls -l /var/log/foo.* > /tmp/foologfiles",
        },
      },
    }
   */

  function Logrotate(config, callback) {
    var logrotateConfig = [];
    fer.reduce(Object.keys(config), function(path, offset, deferred) {
      fer.value(config[path]).then(function(config) {
        logrotateConfig.push('{1} {'.format(path));
        Object.keys(config).forEach(function(value) {
          // add config entries with no values
          if (config[value] === true) {
            logrotateConfig.push('    {1}'.format(value));
          }

          // add config entries with actual values
          var valued_entries = [
            'size',
            'rotate',
          ];
          if (valued_entries.indexOf(value) > -1) {
            logrotateConfig.push('    {1} {2}'.format(value, config[value]));
          }

          // add script lines
          var scripts = [
            'postrotate',
            'prerotate',
          ];
          if (scripts.indexOf(value) > -1) {
            logrotateConfig.push('    {1}'.format(value));
            logrotateConfig.push('        {1}'.format(config[value]));
            logrotateConfig.push('    endscript');
          }
        });
        logrotateConfig.push('}');
        fer.fs.writeFileSync('/etc/logrotate.d/fer', logrotateConfig.join('\n')+'\n');
        deferred.resolve();
      });
    }).then(function() {
      callback();
    }).fail(function(e) {
      console.log(e);
      callback();
    });
  } // Logrotate

  return Logrotate;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/logrotate.md').toString();
  },
  run_at: function() {
    return fer.base_run_at + 50;
  },
  cls: Logrotate
};