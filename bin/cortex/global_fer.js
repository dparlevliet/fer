require('./js_extensions.js');

// Create a document for jQuery to use.
//
// This is to fix errors caused by dependencies improperly using jQuery in
// nodejs. Instead of having to submit patches for packages we do know this
// issue exists in, and wait for the fix - this allows us to just side-step
// the entire issue and get on with the job.
//
// http://stackoverflow.com/a/25516666/3047282
global.jsdom = require("jsdom");
var markup = '<html><body></body></html>';
var doc = global.jsdom.jsdom(markup);
global.window = doc.parentWindow;
//

global.fer = (function() {
  function Fer() {
    var parent = this;

    // nodejs libraries commonly used
    parent.child_process    = require('child_process');
    parent.fs               = require('fs');
    parent.os               = require('os');
    parent.Q                = require('q');
    parent.requestify       = require('requestify');
    parent.path             = require('path');
    parent.readline         = require('readline');
    parent.mkdirp           = require('mkdirp');
    parent.posix            = require('posix');
    parent.crypto           = require('crypto');

    parent.base_dir         = parent.path.normalize(__dirname+'/../../');
    parent.config           = require(parent.base_dir + 'bin/conf/client-config.js');
    parent.FileUtils        = require(parent.base_dir + 'bin/cortex/file_utils.js');
    parent.base_run_at      = 0;

    parent.managedFileWarning = [
      '###################################',
      '# Managed by Fer                  #',
      '###################################',
      '# !WARNING!                       #',
      '# DO NOT MANUALLY EDIT THIS FILE! #',
      '###################################',
      '',
    ];
    parent.writeWithFileWarning = function(fileName, lines) {
      return parent.do(function(deferred) {
        var cleanedEntries = [];
        lines.forEach(function(line) {
          if (parent.managedFileWarning.indexOf(line) === -1) {
            cleanedEntries.push(line);
          }
        });
        parent.fs.writeFileSync(
          fileName,
          parent.managedFileWarning.concat(
            cleanedEntries
          ).join("\n")+"\n"
        );
        deferred.resolve();
      });
    };

    /***************************************************************************
     * Turn a function in to a promise function
     */
    parent.do = function(f) {
      var deferred = parent.Q.defer();
      try {
        f(deferred);
      } catch (e) {
        console.log('Defer error:', e);
      }
      return deferred.promise;
    };

    /***************************************************************************
     * A wrapper for Q.reduce so it can be used in a more readable manner.
     *
     * Example:
         [1,2,3,4].reduce(function(value, offset, deferred) {
          // do something magical here
          deferred.resolve();
         }).then(function() {
          // do stuff when everything is finished iterating
         });
     */
    parent.reduce = function(arrayList, iterCallback) {
      return parent.do(function(deferred) {
        arrayList.reduce(
          function(previous, value, offset) {
            return previous.then(function() {
              return parent.do(function(deferred) {
                iterCallback(value, offset, deferred);
              });
            });
          },
          parent.do(
            function(deferred) {
              deferred.resolve();
            }
          )
        ).then(function() {
          deferred.resolve();
        }).fail(function(err) {
          console.log(err);
          deferred.resolve();
        });
      });
    };

    /***************************************************************************
     * Generate a random string of a defined length
     *
     * !WARNING! This should not be used for security purposes.
     *
     * Source: http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
     */
    parent.randomString = function(length) {
      var s = "";
      while (s.length<length && length>0) {
        var v = Math.random()<0.5?32:0;
        s += String.fromCharCode(
                Math.round(Math.random()*((122-v)-(97-v))+(97-v))
              );
      }
      return s;
    };

    /***************************************************************************
     * Interpolates a value. Values in fer can be a literal or a function so
     * when we want to access a config variable we should do so by calling
     * this method so that it can be interpolated in to a usable form.
     *
     * The use of anonymous functions for values allows fer to stay incredibly
     * flexible.
     *
     * Example:
         fer.value(config).then(function(config) {
           if (typeof(config.value) !== 'undefined') {
             do_something(fer.value(config.value));
           }
         });
     */
    parent.value = function(value) {
      return parent.do(function(deferred) {
        if (typeof(value) === 'function') {
          var result = value();
          if (typeof(result) == 'function') {
            parent.value(result).then(function(n_value) {
              deferred.resolve(n_value);
            });
          } else {
            deferred.resolve(result);
          }
        } else {
          deferred.resolve(value);
        }
      }).fail(function(err) {
        console.log(err);
      });
    };

    /**
     * Takes a list object or a dictionary object and interpolates all
     * values.
     *
     * Example:
        fer.values({
          test: function() {
            return 12;
          }
        }).then(function(options) {
          console.log(options);
        });

      * Or:
        fer.values([
          function() {
            return 12;
          }
        ]).then(function(values) {
          console.log(values);
        });
     */
    parent.values = function(values, skip_keys) {
      return parent.do(function(deferred) {
        if (!values || typeof(values) !== 'object') {
          return deferred.resolve(values);
        }

        var n_values;
        if (values.forEach) {
          if (values.length == 0) {
            return deferred.resolve(values);
          }

          n_values = [];
          values.forEach(function(value, offset) {
            parent.value(value).then(function(n_value) {
              n_values.push(n_value);
              if (offset == n_values.length - 1) {
                deferred.resolve(n_values);
              }
            });
          });
        } else {
          if (Object.keys(values).length == 0) {
            return deferred.resolve(values);
          }

          n_values = {};
          Object.keys(values).reduce(function(previous, key, offset) {
            return previous.then(function() {
              return parent.do(function(d1) {
                if (skip_keys && skip_keys.indexOf(key) !== -1) {
                  n_values[key] = values[key];
                  d1.resolve();
                  return true;
                }

                parent.value(values[key]).then(function(n_value) {
                  parent.value(n_value).then(function(n_value) {
                    n_values[key] = n_value;
                    d1.resolve();
                  });
                });
              });
            });
          }, parent.do(function(d0) {
            d0.resolve();
          })).then(function() {
            deferred.resolve(n_values);
          });
        }
      });
    };

    /***************************************************************************
     * Handle the safe merge of two configs based on the associated priority.
     *
     * For example, if you use `fer.config_merge_left(config1, config2)` then
     * the settings available in config2 will be given priority and override
     * the settings in config1. However, it's a safe override not a crude
     * override.
     *
     * This means that you can discretely change individual sub values which
     * gives you a lot of control when used with reusable components.
     *
     * Example:
          var config1 = {
            file_install: {
              '/tmp/file_1': {
                source: 'fer://file_1.json',
                mode: 444,
              }
            }
          };
          var config2 = {
            file_install: {
              '/tmp/file_1': {
                source: 'fer://file_2.json',
              }
            }
          };
          var config_new = fer.config_merge_left(config1, config2);
          console.log(config_new);

      The above example should produce:
          {
            file_install: {
              '/tmp/file_1': {
                source: 'fer://file_2.json',
                mode: 444,
              }
            }
          };
     */
    parent.config_merge_left = new (require('./config_merger.js'))(parent);
    parent.config_merge_right = function(config_left, config_right) {
      return parent.config_merge_left(config_right, config_left);
    };

    /***************************************************************************
     * Memory
     */
    parent.memory = (function() {
      function Memory() {
        var self = this;
        var memory_path = parent.base_dir+'/tmp/memory.json';

        // ensure exists
        try {
          if (parent.fs.lstatSync(memory_path).isFile()) {
            // do nothing
          }
        } catch (e) {
          // if the file doesn't exist it will throw an exception
          parent.fs.writeFileSync(memory_path, JSON.stringify({}));
        }

        var memory_store = {};

        // load
        self.load = function() {
          memory_store = JSON.parse(parent.fs.readFileSync(memory_path));
        };

        self.save = function() {
          parent.fs.writeFileSync(memory_path, JSON.stringify(memory_store, null, 2));
        };

        self.get = function(key) {
          return memory_store[key];
        };

        self.set = function(key, value) {
          memory_store[key] = value;
          self.save();
        };

        return self;
      }

      return new Memory();
    }());

    /**
     * Wrapper for the ``command`` entry in module config. It allows modules to
     * remain DRY.
     *
     * @param value <string/function> the shell command to run
     *
     * @example
     *  fer.runModuleCommand(config.command).then(function() {
     *    deferred.resolve();
     *  });
     */
    parent.runModuleCommand = function(value) {
      return parent.do(function(deferred) {
        if (typeof(value) === 'function') {
          parent.value(value).then(function() {
            deferred.resolve();
          });
        } else {
          parent.command(value).then(function() {
            deferred.resolve();
          });
        }
      });
    };

    /***************************************************************************
     * A dictionary list of all modules available for use.
     *
     * For instance, the module "PackageManagers" would make available `apt` and
     * `yum`.
     *
     * @example
     *   fer.modules.apt({ packages: ['htop'] })
     */
    parent.modules = (function() {
      function Modules() {
        var self = this;

        parent.fs.readdirSync(
          __dirname + '/../modules/'
        ).forEach(function (mName) {
          try {
            parent.fs.readdirSync(
              '{1}/../modules/{2}/client/managers/'.format(__dirname, mName)
            ).forEach(function(name) {
              var key = name.replace('.js', '');
              self[key] = require('{1}/../modules/{2}/client/managers/{3}'.format(__dirname, mName, name));
            });
          } catch(e) {
            console.log(e);
            // this module doesn't have any client rules
            return true;
          }
        });
      }

      return new Modules();
    }());

    /***************************************************************************
     * Handles the execution of shell commands.
     *
     * Example:
     *  fer.command("ls -al", false).then(function(code) { console.log('done'); });
     *
     * @param command <String/Function> The system command to call. eg. "ls -al"
     * @param silent <Boolean> Define whether to log this execution to the TTY at all
     * @return promise
     *    @param code <Int> The integer value returned by the executable
     *    @param content <String> The full log that the executable returned
     */
    parent.command = function(command, silent, run_as) {
      if (parent.config.verbosity >= 6) {
        silent = false;
      }
      return parent.do(function(deferred) {
        parent.value(command).then(function(command) {
          if (!command) {
            return deferred.resolve();
          }
          var logIndent   = parent.lastLogIndent;
          var sig         = parent.randomString(8);

          var outlog = function(message, indent) {
            parent.log(
              0,
              message,
              logIndent + indent,
              false,
              true
            );
          };

          if (typeof(command.forEach) === 'undefined') {
            command = [command];
          }

          if (run_as) {
            //command = ['su {1}'.format(run_as), 'cd ~'].concat(command);
          }

          if (!silent) {
            outlog('STARTING with identity {2}'.format(command, sig), 1);
            command.forEach(function(command) {
              outlog("EXEC ({1}): {2}".format(sig, command), 2);
            });
          }

          command = command.join("\n");
          var tempBashFile = '/tmp/{1}.tmp'.format(sig);
          parent.fs.writeFileSync(tempBashFile, [
            '#/bin/bash',
            command
          ].join("\n"));
          var child;
          if (run_as) {
            child = parent.child_process.spawn('sudo', ['-i', '-u', run_as, 'bash', tempBashFile]);
          } else {
            child = parent.child_process.spawn('bash', [tempBashFile]);
          }
          var log = '';

          // Parse the process stream data and reformat it for display
          function output(data) {
            data.toString().split("\n").forEach(function(event) {
              if (event.trim() == '') {
                return;
              }
              outlog('CMD ({2}): {1}'.format(event, sig), 2);
            });
          }

          //spit stdout to screen
          child.stdout.on('data', function (data) {
            log += data;
            if (!silent) {
              output(data);
            }
          });

          //spit stderr to screen
          child.stderr.on('data', function (data) {
            log += data;
            if (!silent) {
              output(data);
            }
          });

          child.on('close', function (code) {
            if (!silent) {
              outlog('END ({1}) with exit code {2}'.format(sig, code), 1);
            }

            parent.fs.unlink(tempBashFile, function() {});
            parent.lastLogIndent = logIndent;
            deferred.resolve({
              code: code,
              contents: log
            });
          });
        });
      });
    };

    /***************************************************************************
     * Handle logging to the tty based on Fer's verbosity level
     *
     * @param verbosity <Int> A value from 0-4 with 0 being always show
     * @param str <String> The string to log
     * @param indent <Int> The number of indents to append to the string
     */
    parent.lastLogIndent = 0;
    parent.log = function(verbosity, str, indent, _return, ignore_indent_storage) {
      var indent_str = '';

      if (!indent) {
        indent = 0;
      } else if (parent.lastLogIndent + 1 < indent && !ignore_indent_storage) {
        indent = parent.lastLogIndent + 1;
        ignore_indent_storage = true;
      }

      for (var x = 0; x<indent; x++) {
        indent_str += '  ';
      }

      if (!_return) {
        if (parent.config.verbosity >= verbosity) {
          if (!ignore_indent_storage) {
            parent.lastLogIndent = indent;
          }
          console.log('[ '+(new Date()).toISOString()+' ] ' + indent_str + str);
        }
      } else {
        if (!ignore_indent_storage) {
          parent.lastLogIndent = indent;
        }
        return indent_str + str;
      }
    };

    /***************************************************************************
     * Get distribution information.
     */
    if (parent.os.platform() === 'linux') {
      parent.command("cat /etc/lsb-release", true).then(function(response) {
        var lines = response.contents.split(parent.os.EOL);

        // parse the lsb-release information and cherry-pick useful information
        try {
          lines.forEach(function(line) {
            var parts = line.split(/=/);
            if (parts.lenth != 2) {
              return true;
            }

            var key = parts[0];
            var value = parts[1].replace(/['"]/, '');

            parent.platform = parent.os.platform();
            if (key === 'DISTRIB_ID') {
              parent.distribution = value.toLowerCase();
            }

            if (key === 'DISTRIB_RELEASE') {
              parent.distribution_release = value.toLowerCase();
            }

            if (key === 'DISTRIB_CODENAME') {
              parent.distribution_codename = value.toLowerCase();
            }
          });
        } catch (e) {
          console.log(e);
        }

        // broadcast that we're ready to begin now
        parent.trigger('ready');
      });
    } else {
      console.error('Fer has only beed tested on Ubuntu Linux. If you want to continue, please comment out this line and trigger ready.');
      //parent.trigger('ready');
    }

    /***************************************************************************
     * Event handler
     */
    var waiting = {};

    // get all events
    parent.getEvents = function(event) {
      return waiting[event];
    };

    // trigger an event and call all callbacks
    parent.trigger = function(event) {
      if (waiting[event]) {
        waiting[event].forEach(function(callback, offset) {
          callback();
          delete waiting[event][offset];
        });
      }
    };

    // listen for events
    parent.on = function(event, callback) {
      if (!waiting[event]) {
        waiting[event] = [];
      }

      waiting[event].push(callback);
    };

    // http request to the fer server
    parent.server = function(url, log_error) {
      return parent.do(function(deferred) {
        var fer_server = 'http' +
          ((parent.config.source_ssl)?'s':'') + '://' +
          parent.config.source_hostname +
          ((parent.config.source_port)?':'+parent.config.source_port:'');

        // Checks to make sure we're about to run the most recent version of Fer.
        // If not, download the most recent version from the server.
        parent.requestify.get(
          fer_server + url
        ).then(function(response) {
          response.getBody();
          deferred.resolve(response);
        }).catch(function(err) {
          if (log_error) {
            parent.log(0, '!ERROR! {1} {2}'.format(url, JSON.stringify(err)), 2);
          }
          deferred.reject(err);
        });
      });
    };

    parent.deviceInfo = require('./device_detection.js');

    parent.hash = function(string, hashType, digestType) {
      return parent.crypto.createHash(hashType).update(string).digest(digestType || "hex");
    };

    parent.md5 = function(string) {
      return parent.hash(string, 'md5');
    };

    parent.sha1 = function(string) {
      return parent.hash(string, 'sha1');
    };

    parent.sha256 = function(string) {
      return parent.hash(string, 'sha256');
    };

    parent.time = function(f) {
      var start = (new Date()).getTime();
      return parent.do(function(deferred) {
        f(deferred);
      }).then(function() {
        var now = (new Date()).getTime();
        parent.log(5, 'Took {1}ms'.format(now-start), parent.lastLogIndent+1);
      });
    };

  }

  return new Fer();
}());