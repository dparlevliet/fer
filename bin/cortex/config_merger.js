/* global fer */

/**
 * Handles the merging and lazy unpacking of two dicts based on right-side
 * priority.
 *
 */
module.exports = function(fer) {
  function Construct(i_config_left, i_config_right) {

    var deduplicatedMerge = function(left_value, right_value) {
      return fer.do(function(deferred) {
        var uValues = [];
        var nConfig = left_value.concat(right_value);
        fer.reduce(nConfig, function(value, offset, _deferred) {
          var found = false;
          fer.reduce(uValues, function(uValue, uOffset, uDeferred) {
            if (
              typeof(uValue) === 'object' &&
              typeof(value) === 'object' &&
              (
                uValue.run_at &&
                value.run_at &&
                uValue.run_at == value.run_at
              )
            ) {
              // we found a config entry sharing the same run_at times
              // so we need to merge them. Don't try and merge dicts that
              // don't have the run_at provided, because it will interfere
              // with other forms of legitimate lists of dictionaries like
              // ``modify`` in ``file_install``.
              found = true;
              Construct(uValue, value).then(function(new_value) {
                uValues[uOffset] = new_value;
                uDeferred.resolve();
              }).fail(function(e) {
                console.log(e);
                uDeferred.resolve();
              });
            } else if (uValue === value) {
              found = true;
              uDeferred.resolve();
            } else {
              uDeferred.resolve();
            }
          }).then(function() {
            if (!found) {
              uValues.push(value);
            }
            _deferred.resolve();
          }).fail(function(e) {
            console.log(e);
            _deferred.resolve();
          });
        }).then(function() {
          deferred.resolve(uValues);
        }).fail(function(e) {
          console.log(e);
          deferred.resolve(uValues);
        });
      });
    };

    return fer.do(function(deferred) {
      if (typeof(i_config_left) === 'undefined') {
        return deferred.resolve(i_config_left);
      }

      if (typeof(i_config_right) === 'undefined') {
        return deferred.resolve(i_config_right);
      }

      // clone the objects before beginning
      i_config_left = Object.assign({}, i_config_left);
      i_config_right = Object.assign({}, i_config_right);

      fer.value(i_config_left, ['command']).then(function(config_left) {
        fer.value(i_config_right, ['command']).then(function(config_right) {
          var keys = Object.keys(config_left);
          if (keys.length == 0) {
            return deferred.resolve(config_right);
          }

          fer.reduce(Object.keys(config_right), function(key, offset, _deferred) {
            var left_value = config_left[key];
            var right_value = config_right[key];

            if (typeof(right_value) === 'undefined') {
              _deferred.resolve();
            } else if (
              typeof(left_value) === 'function' ||
              typeof(right_value) === 'function'
            ) {
              // we don't merge functions at this stage so we overwrite instead
              //
              // Note: Consider ``command`` functions when reviewing this -
              // we don't want to execute them at this stage
              config_left[key] = config_right[key];
              _deferred.resolve();
            } else if (typeof(left_value) !== 'undefined') {
              if (
                (typeof(left_value) === 'object' && typeof(left_value.forEach) !== 'undefined') &&
                (typeof(right_value) === 'object' && typeof(right_value.forEach) === 'undefined')
              ) {
                // conflicting keys found - right side is a dict object and the
                // left is an array object - we need to resolve this. Right side
                // key takes priority, but we want to do a smart merge.
                deduplicatedMerge(left_value, [right_value]).then(function(uValues) {
                  config_left[key] = uValues;
                  _deferred.resolve();
                });
              } else if (
                (typeof(left_value) === 'object' && typeof(left_value.forEach) === 'undefined') &&
                (typeof(right_value) === 'object' && typeof(right_value.forEach) !== 'undefined')
              ) {
                // conflicting keys found - left side is a dict object and the
                // right is an array object - we need to resolve this. Right side
                // key takes priority, but we want to do a smart merge.
                deduplicatedMerge([left_value], right_value).then(function(uValues) {
                  config_left[key] = uValues;
                  _deferred.resolve();
                });
              } else if (
                typeof(left_value) === 'object' &&
                typeof(right_value) == 'object'
              ) {
                // both sides are objects, but we need to check what type of
                // objects they are first.
                if (left_value.forEach && right_value.forEach) {
                  // both sides are arrays so do a deduplicated merge
                  deduplicatedMerge(left_value, right_value).then(function(uValues) {
                    config_left[key] = uValues;
                    _deferred.resolve();
                  });
                } else {
                  if (
                    (
                      typeof(right_value.run_at) !== 'undefined' &&
                      typeof(left_value.run_at) === 'undefined'
                    ) ||
                    (
                      typeof(right_value.run_at) === 'undefined' &&
                      typeof(left_value.run_at) !== 'undefined'
                    ) ||
                    (
                      right_value.run_at != left_value.run_at
                    )
                  ) {
                    // nothing to merge here - we've found two separate config
                    // entries for the same key with different run_at times
                    // so we need to convert it to an array
                    config_left[key] = [left_value, right_value];
                    _deferred.resolve();
                  } else {
                    // Ooooh boy .. both sides are dictionaries. Ok, let's
                    // recursively merge them ..
                    Construct(left_value, right_value).then(function(new_value) {
                      // should be safe to override the left value now
                      config_left[key] = new_value;
                      _deferred.resolve();
                    }).fail(function(e) {
                      console.log(e);
                      _deferred.resolve();
                    });
                  }
                }
              } else {
                // nothing of interest, we can just replace it
                config_left[key] = right_value;
                _deferred.resolve();
              }
            } else {
              config_left[key] = config_right[key];
              _deferred.resolve();
            }
          }).then(function() {
            deferred.resolve(config_left);
          }).fail(function(e) {
            console.log(e);
          });
        });
      });
    });
  }

  return Construct;
};