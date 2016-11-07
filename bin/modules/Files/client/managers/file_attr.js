/* global fer */

var FileAttr = (function() {

  /**
    Example:
    {
      file_attr: {
        '/etc/aliases': '0644',
        '/etc/test_file': { mode: '0644', uid: 1000, gid: 1000 },
      },
    }
   */

  function FileAttr(config, callback) {
    fer.reduce(Object.keys(config), function(filePath, offset, deferred) {
      fer.value(config[filePath]).then(function(config) {
        fer.log(0, 'Configuring {1}'.format(filePath), 1);
        if (typeof(config) === 'object') {
          if (config.mode) {
            fer.fs.chmodSync(filePath, config.mode);
          }
          if (config.uid && config.gid) {
            fer.fs.chownSync(filePath, config.uid, config.gid);
          } else if (
            (!config.uid && config.gid) ||
            (config.uid && !config.gid)
          ) {
            fer.log(0, '!WARNING! Both uid and gid must be provided', 2);
          }
        } else {
          fer.fs.chmodSync(filePath, config);
        }
        deferred.resolve();
      }).fail(function(e) {
        console.log(e);
        deferred.resolve();
      });
    }).then(function() {
      callback();
    }).fail(function(e) {
      console.log(e);
      callback();
    });
  } // FileAttr

  return FileAttr;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/file_modify.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 404;
  },
  cls: FileAttr
};