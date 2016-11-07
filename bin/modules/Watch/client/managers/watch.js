/* global fer */

module.exports = (function() {

  /**
    Example:
    {
      watch: {
        '/etc/aliases': function(changes) {
          return fer.do(function(deferred) {

          });
        },
        '/tmp/': function(changes) {
          return fer.do(function(deferred) {

          });
        },
      },
    }
   */

  function Watcher(config, callback) {
    fer.reduce(Object.keys(config), function(path, offset, deferred) {
      fer.FileUtils.walkSumList([ path ]).then(function(originalList) {
        fer.log(0, 'Watching {1}'.format(path), 1);
        fer.on('beforeDone', function() {
          return fer.do(function(deferred) {
            fer.FileUtils.walkSumList([ path ]).then(function(newList) {
              var changed = [];
              originalList[0].forEach(function(oFile) {
                newList[0].forEach(function(nFile) {
                  if (
                    oFile.path == nFile.path &&
                    (
                      oFile.md5 != nFile.md5 ||
                      oFile.sha1 != nFile.sha1
                    )
                  ) {
                    changed.push({
                      before: oFile,
                      now: nFile
                    });
                  }
                });
              });
              if (changed.length > 0) {
                fer.log(0, 'watch> changed> {1}'.format(path), 0);
                config[path](changed).then(function() {
                  deferred.resolve();
                });
              } else {
                deferred.resolve();
              }
            }).fail(function(e) {
              console.log(e);
              deferred.resolve();
            });
          });
        });
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
  } // Watcher

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/watch.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 2;
    },
    cls: Watcher
  };
}());