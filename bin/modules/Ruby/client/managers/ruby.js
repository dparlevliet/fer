/* global fer */

var Ruby = (function() {

  /**
   * Example:
      ruby: {
        gems: [
          'sass',
        ],
      }
  */

  function Ruby(config, callback) {
    fer.do(function(deferred) {
      fer.value(config.gems).then(function(gems) {
        if (!gems) {
          return deferred.resolve();
        }
        fer.log(0, 'Installing gem modules', 1);
        if (!fer.FileUtils.fileExists('/usr/bin/gem')) {
          fer.log(0, '!WARNING! gem is not installed.', 2);
          return deferred.resolve();
        }
        fer.command(
          'yes y | gem install {1}'.format(gems.join(' ')),
          false
        ).then(function() {
          deferred.resolve();
        });
      }).fail(function() {
        deferred.resolve();
        console.log(arguments);
      });
    }).then(function() {
      callback();
    });
  } // Ruby

  return Ruby;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/ruby.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 350;
  },
  cls: Ruby
};