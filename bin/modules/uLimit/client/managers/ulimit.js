/* global fer */

module.exports = (function() {
  /**
   * Example:
      ulimit: {
        user1: {
          maxlogins: 3, // both hard and soft maxlogins values for user1
          nofile: {
            soft: 8192,
            hard: 16384
          }, // different soft and hard nofile limits for user1
        },
        '@group1': {
          maxlogins: 15, // both hard and soft for group1
        },
      }
   *
   * Manual:
   *
   *  Each line describes a limit for a user in the form:
   *
   *  <domain>        <type>  <item>  <value>
   *
   *  Where:
   *  <domain> can be:
   *          - a user name
   *          - a group name, with @group syntax
   *          - the wildcard *, for default entry
   *          - the wildcard %, can be also used with %group syntax,
   *                   for maxlogin limit
   *          - NOTE: group and wildcard limits are not applied to root.
   *            To apply a limit to the root user, <domain> must be
   *            the literal username root.
   *
   *  <type> can have the two values:
   *          - "soft" for enforcing the soft limits
   *          - "hard" for enforcing hard limits
   *
   *  <item> can be one of the following:
   *          - core - limits the core file size (KB)
   *          - data - max data size (KB)
   *          - fsize - maximum filesize (KB)
   *          - memlock - max locked-in-memory address space (KB)
   *          - nofile - max number of open files
   *          - rss - max resident set size (KB)
   *          - stack - max stack size (KB)
   *          - cpu - max CPU time (MIN)
   *          - nproc - max number of processes
   *          - as - address space limit (KB)
   *          - maxlogins - max number of logins for this user
   *          - maxsyslogins - max number of logins on the system
   *          - priority - the priority to run user process with
   *          - locks - max number of file locks the user can hold
   *          - sigpending - max number of pending signals
   *          - msgqueue - max memory used by POSIX message queues (bytes)
   *          - nice - max nice priority allowed to raise to values: [-20, 19]
   *          - rtprio - max realtime priority
   *          - chroot - change root to directory (Debian-specific)
   *
   * Also consider: http://linux.die.net/man/2/prlimit
   */

  function uLimit(config, callback) {
    if (!fer.$$ulimit) {
      fer.$$ulimit = {};
      fer.on('beforeDone', function() {
        fer.log(5, 'ulimit> Writing ulimits');
        return fer.do(function(deferred) {
          fer.reduce(Object.keys(fer.$$ulimit), function(domainName, offset, deferred) {
            var lines = [
              '###################################',
              '# Installed by Fer             *  ',
              '###################################',
              '# !WARNING!                    *  ',
              '# DO NOT MANUALLY EDIT THIS FILE! #',
              '###################################',
              '',
            ];
            var build = function(domain, type, item, value) {
              lines.push('{1}\t\t{2}\t\t{3}\t\t{4}'.format(domain, type, item, value));
            };
            fer.value(fer.$$ulimit[domainName]).then(function(config) {
              fer.reduce(Object.keys(config), function(entry, offset, deferred) {
                if (typeof(config[entry]) === 'object') {
                  build(domainName, 'soft', entry, config[entry].soft);
                  build(domainName, 'hard', entry, config[entry].hard);
                } else {
                  build(domainName, '-', entry, config[entry]);
                }
                deferred.resolve();
              }).then(function() {
                fer.fs.writeFileSync('/etc/security/limits.conf', lines.join("\n")+"\n");
                deferred.resolve();
              });
            });
          }).then(function() {
            deferred.resolve();
          });
        }).fail(function(e) {
          console.log(e);
        });
      });
    }
    fer.config_merge_left(fer.$$ulimits, config).then(function(config) {
      fer.$$ulimit = config;
      callback();
    });
  } // uLimit

  return {
    help: function() {
      return fer.fs.readFileSync(__dirname + '/../help/ulimit.txt').toString();
    },
    run_at: function() {
      return fer.base_run_at + 500;
    },
    cls: uLimit
  };
}());