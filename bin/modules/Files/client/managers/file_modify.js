/* global fer */

var FileModify = (function() {

  /**
    Example:
    {
      file_modify: {
        '/etc/aliases': [
          {
            search: /^root\: root@yourdomain.com/,  // Regex to search for
            replace: '',                            // String to replace the pattern match with
            command: "newaliases",                  // Run this if the file is changed
          },
        ],
      },
    }
   */

  function FileModify(config, callback) {
    fer.reduce(Object.keys(config), function(filePath, offset, deferred) {
      fer.value(config[filePath]).then(function(entries) {
        if (typeof(entries.forEach) === 'undefined') {
          fer.log(0, '!WARNING! Cannot resolve action for {1}'.format(filePath), 1);
          return deferred.resolve();
        }
        fer.reduce(entries, function(entry, offset, deferred) {
          fer.value(entry, ['command']).then(function(config) {
            if (!fer.FileUtils.fileExists(filePath)) {
              return deferred.resolve();
            }
            fer.FileUtils.readlines(filePath).then(function(lines) {
              var newLines = [];
              var modified = false;
              fer.reduce(lines, function(line, offset, deferred) {
                var rLine = line.replace(config.search, config.replace);
                if (rLine != line) {
                  modified = true;
                }
                newLines.push(rLine);
                deferred.resolve();
              }).then(function() {
                if (modified) {
                  fer.log(0, 'Modifying file {1}'.format(filePath), 1);
                  fer.fs.writeFileSync(filePath, newLines.join("\n")+"\n");
                  fer.runModuleCommand(config.command).then(function() {
                    deferred.resolve();
                  });
                } else {
                  deferred.resolve();
                }
              });
            });
          });
        }).then(function() {
          deferred.resolve();
        });
      });
    }).then(function() {
      callback();
    });
  } // FileModify

  return FileModify;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/file_modify.md').toString();
  },
  run_at: function() {
    return fer.base_run_at + 403;
  },
  cls: FileModify
};