/* global fer */

var Python = (function() {

  /**
   * Example:
      python: {
        pip: [
          'urllib3',
          'six',
        ],
        pip3: [
          'urllib3',
          'six',
        ],
      }
  */

  function Python(config, callback) {
    fer.do(function(deferred) {
      fer.value(config.pip).then(function(pip) {
        if (!pip) {
          return deferred.resolve();
        }
        fer.log(0, 'Installing pip modules', 1);
        if (!fer.FileUtils.fileExists('/usr/bin/pip')) {
          fer.log(0, '!WARNING! pip is not installed.', 2);
          return deferred.resolve();
        }
        fer.command(
          'yes y | pip install {1}'.format(pip.join(' ')),
          false
        ).then(function() {
          deferred.resolve();
        });
      }).fail(function() {
        deferred.resolve();
        console.log(arguments);
      });
    }).then(function() {
      return fer.do(function(deferred) {
        fer.value(config.pip3).then(function(pip3) {
          if (!pip3) {
            return deferred.resolve();
          }
          fer.log(0, 'Installing pip3 modules', 1);
          if (!fer.FileUtils.fileExists('/usr/bin/pip3')) {
            fer.log(0, '!WARNING! pip3 is not installed.', 2);
            return deferred.resolve();
          }
          fer.command(
            'yes y | pip3 install {1}'.format(pip3.join(' ')),
            false
          ).then(function() {
            deferred.resolve();
          });
        }).fail(function() {
          deferred.resolve();
          console.log(arguments);
        });
      });
    }).then(function() {
      callback();
    });
  } // Python

  return Python;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/python.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 300;
  },
  cls: Python
};