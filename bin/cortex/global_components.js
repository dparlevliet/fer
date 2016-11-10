/* global fer */
global.components = (function() {
  function Components() {
    var self = this;
    var Component = require('./component.js');

    var components_dir = '../../usr/components/';
    fer.FileUtils.walk('{1}/{2}'.format(__dirname, components_dir)).then(function(list) {
      list.forEach(function(path) {
        if (path.indexOf('.js') > -1) {
          var components = require(components_dir+path);
          var prefix = fer.path.dirname(path).replace('/', '_');
          if (prefix.length > 0) {
            prefix = prefix + '_';
          }
          var name = prefix + components.name;
          if (components && components.forEach) {
            components.forEach(function(component) {
              self[name] = new Component(component.config);
            });
          } else {
            self[name] = new Component(components.config);
          }
        }
      });
    });
  }

  return new Components();
}());