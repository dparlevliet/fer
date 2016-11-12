/* global fer */

module.exports = (function() {

  /**
   * Example:
     hosts: {
        '127.0.0.1': [
          'tests-url.com
        ],
        '127.0.1.1': null, # remove hosts attached to this ip
      }
  */

  function Hosts(config, callback) {
    if (!fer.$$host) {
      fer.$$host = {};
      fer.on('beforeDone', function() {
        var start = (new Date()).getTime();
        fer.log(0, 'beforeDone-hosts> Starting', 0);
        return fer.do(function(deferred) {
          var unique_map = {};
          config = fer.$$host;
          fer.reduce(Object.keys(config), function(ip, index, deferred) {
            config[ip].forEach(function(hostPath) {
              if (typeof(unique_map[hostPath]) === 'undefined') {
                unique_map[hostPath] = ip;
              } else {
                fer.log(0, '!WARNING! Duplicate entry for {1} found.'.format(hostPath), 1);
              }
            });
            deferred.resolve();
          }).then(function() {
            return fer.do(function(deferred) {
              var newLines = [
                '###################################',
                '# Installed by Fer                #',
                '###################################',
                '# !WARNING!                       #',
                '# DO NOT MANUALLY EDIT THIS FILE! #',
                '###################################',
                '',
              ];
              fer.FileUtils.readlines('/etc/hosts').then(function(lines) {
                lines.forEach(function(line) {
                  if (line.substr(0, 1) === '#') {
                    newLines.push(line);
                    return true;
                  }
                  line = line.replace("\t", ' ');
                  var lineHosts = line.split(' ');
                  var lineIp = lineHosts.splice(0, 1)[0];
                  if (typeof(config[lineIp]) !== 'undefined') {
                    // we're going to build this later so we don't need it now
                    return true;
                  }
                  // confirm all hosts should belong to this lineIp
                  lineHosts.forEach(function(host, offset) {
                    if (typeof(unique_map[host]) !== 'undefined' && unique_map[host] != lineIp) {
                      // this hostname has changed ip
                      lineHosts.splice(offset, 1);
                    }
                  });
                  newLines.push('{1} {2}'.format(lineIp, lineHosts.join(' ')));
                });
                deferred.resolve(newLines);
              });
            });
          }).then(function(lines) {
            return fer.do(function(deferred) {
              fer.reduce(Object.keys(config), function(ip, index, deferred) {
                if (config[ip] !== null && config[ip].length > 0) {
                  lines.push('{1} {2}'.format(ip, config[ip].join(' ')));
                }
                deferred.resolve();
              }).then(function() {
                fer.fs.writeFileSync('/etc/hosts', lines.join("\n")+"\n");
                deferred.resolve();
              });
            });
          }).then(function() {
            var ms = (new Date()).getTime() - start;
            fer.log(0, 'beforeDone-hosts> Completed in {1}ms'.format(ms), 0);
            deferred.resolve();
          });
        });
      });
    }
    fer.config_merge_left(fer.$$host, config).then(function(config) {
      fer.$$host = config;
      callback();
    });
  } // Hosts

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/hosts.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 5;
    },
    cls: Hosts
  };
}());