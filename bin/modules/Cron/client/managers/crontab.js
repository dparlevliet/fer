/* global fer */

var Crontab = (function() {

  //  Example:
  //  {
  //    crontab: {
  //      // Create /etc/cron.d/test_file, with the following contents
  //      file_name: [
  //        '*/1 * * * * root /bin/true',
  //      ],
  //      old_filename: null,
  //    },
  //  }

  function Crontab(config, callback) {
    if (!fer.$$crontab) {
      fer.$$crontab = {};
      fer.on('beforeDone', function() {
        return fer.do(function(deferred) {
          fer.reduce(Object.keys(fer.$$crontab), function(fileName, offset, deferred) {
            fer.value(fer.$$crontab[fileName]).then(function(entries) {
              var filePath = '/etc/cron.d/{1}'.format(fileName);
              if (entries === null) {
                if (fer.FileUtils.fileExists(filePath)) {
                  fer.log(0, 'Uninstalling cron file {1}'.format(filePath), 1);
                  fer.fs.unlinkSync(filePath);
                }
              } else if (typeof(entries.forEach) !== 'undefined') {
                fer.log(0, 'Installing cron file {1}'.format(filePath), 1);
                fer.fs.writeFileSync(filePath, [
                  '###################################',
                  '# Installed by Fer                #',
                  '###################################',
                  '# !WARNING!                       #',
                  '# DO NOT MANUALLY EDIT THIS FILE! #',
                  '###################################',
                  '',
                ].concat(entries).join("\n")+"\n");
              } else {
                fer.log(0, '!WARNING! Cannot resolve action for {1}'.format(fileName), 1);
              }
              deferred.resolve();
            });
          }).then(function() {
            deferred.resolve();
          });
        });
      });
    }
    fer.config_merge_left(fer.$$crontab, config).then(function(config) {
      fer.$$crontab = config;
      callback();
    });
  } // Crontab

  return Crontab;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/crontab.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 400;
  },
  cls: Crontab
};