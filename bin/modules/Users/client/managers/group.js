/* global fer */
var bin = require('../bin/index.js');
var Groups = bin.Groups;

/**
 *
  {
    group: {
      testgroup: {
        gid: 998,
      },
      badgroup: null,  # Remove this group
    },
  }
 */
var GroupsConfig = (function() {
  function GroupsConfig(config, callback) {
    fer.value(config).then(function(config) {
      fer.reduce(Object.keys(config), function(gname, offset, deferred) {
        fer.log(2, 'Handling configuration for {1}'.format(gname), 1);
        fer.value(config[gname]).then(function(config) {
          Groups.check_exists(gname).then(function(exists) {
            if (!exists) {
              return deferred.resolve();
            }
            if (config === null) {
              fer.log(0, 'Deleting group {1}'.format(gname), 2);
              return deferred.resolve();
            }
            fer.log(0, 'Creating group {1}'.format(gname), 2);
            Groups.create(gname, config).then(function() {
              deferred.resolve();
            });
          });
        }).then(function() {
          fer.log(2, "Done setting up " + gname, 1);
          deferred.resolve();
        });
      }).then(function() {
        callback();
      });
    });
  }

  return GroupsConfig;
}());

module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/groups.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 199;
  },
  cls: GroupsConfig,
};