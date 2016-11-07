var defer = require('./defer.js');
var crypto = require('crypto');
var fs = require('fs');
var walkSync = require('walk-sync');
var Q = require('q');
/* global fer */


module.exports = (function() {
  function FileUtils() {
    var parent = this;

    this.fileExists = function(file) {
      try {
        if (parent.stat(file).isFile()) {
          return true;
        }
      } catch (e) {}
      return false;
    };

    this.directoryExists = function(path) {
      try {
        if (parent.stat(path).isDirectory()) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    this.readlines = function(file) {
      return fer.do(function(deferred) {
        var lines = [];
        var reader = fer.readline.createInterface({
          input: fs.createReadStream(file)
        });
        reader.on('line', function(line) {
          lines.push(line);
        });
        reader.on('close', function() {
          deferred.resolve(lines);
        });
      });
    };

    this.sumFile = function(path, hashType) {
      return defer(function(deferred) {
        var fd = fs.createReadStream(path);
        var hash = crypto.createHash(hashType);
        hash.setEncoding('hex');
        fd.on('end', function() {
          hash.end();
          deferred.resolve(hash.read());
        });
        fd.pipe(hash);
      });
    };

    this.fileMD5 = function(path) {
      return parent.sumFile(path, 'md5');
    };

    this.fileSHA1 = function(path) {
      return parent.sumFile(path, 'sha1');
    };

    this.fileSHA1AndMD5 = function(path) {
      return defer(function(deferred) {
        var md5 = '';
        var sha1 = '';
        parent.fileMD5(path).then(function(sum) {
          md5 = sum;
          return parent.fileSHA1(path);
        }).then(function(sum) {
          sha1 = sum;
          deferred.resolve({
            md5: md5,
            sha1: sha1,
          });
        });
      });
    };

    this.stat = function(path) {
      return fs.lstatSync(path);
    };

    /**
     * Walks down a directory and sums every file in it and returns a list
     * containing the files with the paths and their md5 and sha1 sums
     *
     * Example:
     * [
     *   {
     *      path: '/tmp',
     *      type: 'directory',
     *   },
     *   {
     *      path: '/tmp/file',
     *      type: 'file',
     *      md5: 'asf...',
     *      sha1: 'asf...',
     *   },
     * ]
     */
    this.walkSumList = function(list) {
      var convertFileList = function(clist, path_prefix) {
        return defer(function(d0) {
          clist.reduce(function(previous, path, offset) {
            return previous.then(function() {
              return defer(function(deferred) {
                var md5 = '';
                var sha1 = '';
                var fpath = (path_prefix+'/'+path).replace('//', '/');
                var stat = parent.stat(fpath);
                if (stat.isDirectory()) {
                  clist[offset] = {
                    'path': (path_prefix+'/'+path).replace('//', '/'),
                    'type': 'directory',
                    'stat': stat,
                  };
                  deferred.resolve();
                } else {
                  parent.fileMD5(fpath).then(function(sum) {
                    md5 = sum;
                    return parent.fileSHA1(fpath);
                  }).then(function(sum) {
                    sha1 = sum;
                    clist[offset] = {
                      'path': (path_prefix+'/'+path).replace('//', '/'),
                      'type': 'file',
                      'md5': md5,
                      'sha1': sha1,
                      'stat': stat,
                    };
                    deferred.resolve();
                  });
                }
              });
            });
          }, defer(function(d) {
            d.resolve();
          })).then(function() {
            d0.resolve(clist);
          });
        });
      };

      return defer(function(d0) {
        var final_list = [];
        list.reduce(function(previous, rpath, offset) {
          return previous.then(function() {
            return defer(function(deferred) {
              try {
                var stat = parent.stat(rpath);
                if (stat.isDirectory()) {
                  convertFileList(
                    walkSync(rpath),
                    rpath
                  ).then(function(value) {
                    final_list[offset] = value;
                    deferred.resolve();
                  }).fail(function(e) {
                    console.log(e);
                    deferred.resolve();
                  });
                } else {
                  convertFileList(
                    [rpath],
                    '/'
                  ).then(function(value) {
                    final_list[offset] = value[0];
                    deferred.resolve();
                  }).fail(function(e) {
                    console.log(e);
                    deferred.resolve();
                  });
                }
              } catch (e) {
                console.log(e);
                deferred.resolve();
              }
            });
          });
        }, defer(function(d) {
          d.resolve();
        })).then(function() {
          // done
          d0.resolve(final_list);
        });
      });
    };

  }

  return new FileUtils();
}());