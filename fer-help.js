#!/usr/bin/nodejs
var marked = require('marked');
var TerminalRenderer = require('marked-terminal');

require('./bin/cortex/js_extensions.js');
require('./bin/cortex/global_fer.js');
fer.argv = require('yargs').argv;
/* global fer */

marked.setOptions({
  // Define custom renderer
  renderer: new TerminalRenderer()
});

fer.on('ready', function() {
  var moduleHelp = fer.argv._[0];
  Object.keys(fer.modules).forEach(function(module, offset) {
    try {
      if (module == moduleHelp) {
        console.log(marked(fer.modules[module].help()));
      }
    } catch (e) {
      console.log(e);
    }
  });
});