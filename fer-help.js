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
  var help = fer.argv._[0];
  if (['run_at', 'run_order', 'steps'].indexOf(help) > -1) {
    var order = {};
    Object.keys(fer.modules).forEach(function(module, offset) {
      if (typeof(order[''+fer.modules[module].run_at()]) === 'undefined') {
        order[''+fer.modules[module].run_at()] = [];
      }
      order[''+fer.modules[module].run_at()].push(module);
    });
    Object.keys(order).forEach(function(run_at) {
      console.log('{1}-{2}'.format(run_at, order[run_at].join(', ')));
    });
  } else {
    Object.keys(fer.modules).forEach(function(module, offset) {
      try {
        if (module == help) {
          console.log(marked(fer.modules[module].help()));
        }
      } catch (e) {
        console.log(e);
      }
    });
  }
});