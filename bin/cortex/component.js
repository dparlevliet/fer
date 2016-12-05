/* global fer */

/**
 * Handles the configuration of a Fer component.
 */
var Component = function(component) {
  var parent = this;

  parent.name =  component.name;
  parent.inherit = component.inherit || [];
  parent.config = Object.assign({}, component.config) || {};

  function Component(config) {
    return fer.do(function(deferred) {
      fer.config_merge_left(parent.config, config).then(function(config) {
        deferred.resolve(parent);
      });
    });
  }

  return Component;
};


module.exports = Component;