/* global fer */
global.components = (function() {
  function Components() {
    var self = this;
    var Component = require('./component.js');

    var components_dir = '../../usr/components/';
    fer.fs.readdirSync(
      '{1}/{2}'.format(__dirname, components_dir)
    ).forEach(function (name) {
      var components = require(components_dir + name);
      if (components && components.forEach) {
        components.forEach(function(component) {
          self[component.name] = new Component(component.config);
        });
      } else {
        self[components.name] = new Component(components.config);
      }
    });
  }

  return new Components();
}());