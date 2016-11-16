/* global fer */

var FileAppend = (function() {

  /**
    Example:
    {
      file_append: {
        '/etc/aliases': [
          {
            add: "root: root@yourdomain.com",  // The line to add
            match: /^root/,                    // Replace any and all lines matching this regex
            command: "newaliases",             // Run this if the file is changed
            create: true,                      // Create the file if it doesn't already exist
          },
        ],
      },
    }
   */

  function FileAppend(config, callback) {
    fer.reduce(Object.keys(config), function(filePath, offset, deferred) {
      fer.value(config[filePath]).then(function(entries) {
        if (typeof(entries.forEach) === 'undefined') {
          fer.log(0, '!WARNING! Cannot resolve action for {1}'.format(filePath), 1);
          return deferred.resolve();
        }
        var modified = false;
        fer.reduce(entries, function(entry, offset, deferred) {
          fer.value(entry, ['command']).then(function(config) {
            if (!fer.FileUtils.fileExists(filePath)) {
              if (!config.create) {
                return deferred.resolve();
              }
              fer.fs.writeFileSync(filePath, '');
            }
            fer.FileUtils.readlines(filePath).then(function(lines) {
              var newLines = [];
              var found = false;
              fer.reduce(lines, function(line, offset, deferred) {
                if (line.search(config.match) > -1) {
                  if (line != config.add) {
                    if (!modified) {
                      fer.log(0, 'Modifying file {1}'.format(filePath), 1);
                      modified = true;
                    }
                    line = config.add;
                  }
                  found = true;
                }
                newLines.push(line);
                deferred.resolve();
              }).then(function() {
                if (!found) {
                  newLines.push(entry.add);
                  modified = true;
                }
                fer.fs.writeFileSync(filePath, newLines.join("\n")+"\n");
                if (modified) {
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
  } // FileAppend

  return FileAppend;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/file_append.md').toString();
  },
  run_at: function() {
    return fer.base_run_at + 401;
  },
  cls: FileAppend
};