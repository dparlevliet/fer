/* global fer */

/**
 * Handles the configuration of a Fer component.
 */
var Component = function(config) {
  var parent = this;

  parent.config = config || {};

  function Component(config) {
    return fer.do(function(deferred) {
      fer.config_merge_left(parent.config, config).then(function(config) {
        deferred.resolve(config);
      });
    });
  }

  return Component;
};


module.exports = Component;