/* global fer */

module.exports = (function() {

  /**
    Example:
      {
        symlink: {
          '/tmp/source-file': '/tmp/destination-file',
        },
      }
  */

  function Symlink(config, callback) {
    fer.value(config).then(function(symlinks) {
      fer.reduce(Object.keys(symlinks), function(source, offset, _deferred) {
        try {
          var destination = config[source];
          if (fer.FileUtils.stat(source).isFile()) {
            var linkString = fer.fs.readlinkSync(destination);
            if (linkString != source) {
              fer.fs.unlinkSync(destination);
              throw new Error('create');
            }
            _deferred.resolve();
          }
        } catch (e) {
          fer.log(0, 'Installing symlink: {1} <- {2}'.format(destination, source), 1);
          fer.fs.symlinkSync(source, destination);
          _deferred.resolve();
        }
      }).then(function() {
        callback();
      }).fail(function(e) {
        console.log(e);
        callback();
      });
    });
  } // Symlink

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/symlink.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 1000;
    },
    cls: Symlink
  };
}());