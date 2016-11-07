/* global fer */

var NodeJS = (function() {

  /**
   * Example:
      nodejs: {
        npm: [
          'forever',
        ],
      }
  */

  function NodeJS(config, callback) {
    fer.do(function(deferred) {
      fer.value(config.npm).then(function(npm) {
        if (!npm) {
          return deferred.resolve();
        }
        fer.log(0, 'Installing npm modules', 1);
        if (!fer.FileUtils.fileExists('/usr/lib/node_modules/npm/bin/npm-cli.js')) {
          fer.log(0, '!WARNING! npm is not installed.', 2);
          return deferred.resolve();
        }
        fer.command(
          'npm install -y -g {1}'.format(npm.join(' ')),
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
  } // NodeJS

  return NodeJS;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/nodejs.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 400;
  },
  cls: NodeJS
};