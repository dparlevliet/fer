/* global fer */
module.exports = (function() {
  function Components() {
    var components = this;
    return fer.do(function(deferred) {
      var Component = require('./component.js');
      var components_dir = '../../usr/components/';
      fer.FileUtils.walk('{1}/{2}'.format(__dirname, components_dir)).then(function(list) {
        list.forEach(function(path) {
          if (path.indexOf('.js') > -1) {
            try {
              var component = require(components_dir+path);
              var prefix = fer.path.dirname(path).replace('/', '_');
              if (prefix.length > 0) {
                prefix = prefix + '_';
              }
              var name = prefix + component.name;
              if (component && component.forEach) { // component is actually a list - unusual, but not unreasonable
                component.forEach(function(component) {
                  components[name] = new Component(component);
                });
              } else {
                components[name] = new Component(component);
              }
            } catch (e) {
              console.log(e);
            }
          }
        });
        deferred.resolve(components);
      });
    });
  }

  return Components;
}());