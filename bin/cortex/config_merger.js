/* global fer */

/**
 * Handles the merging and lazy unpacking of two dicts based on right-side
 * priority.
 *
 */
module.exports = function(fer) {
  function Construct(config_left, config_right) {
    return fer.do(function(deferred) {
      if (typeof(config_left) === 'undefined') {
        return deferred.resolve(config_right);
      }

      if (typeof(config_right) === 'undefined') {
        return deferred.resolve(config_left);
      }

      fer.value(config_left, ['command']).then(function(i_config_left) {
        fer.value(config_right, ['command']).then(function(i_config_right) {
          var keys = Object.keys(i_config_right);
          if (keys.length == 0) {
            return deferred.resolve(config_left);
          }

          fer.reduce(keys, function(key, offset, _deferred) {
            // check to see if this key (on the right side) is found to the left
            if (
              typeof(config_right[key]) === 'function' ||
              typeof(config_left[key]) === 'function'
            ) {
              config_left[key] = config_right[key];
              _deferred.resolve();
            } else if (typeof(config_left[key]) !== 'undefined') {
              // conflicting keys found, we need to resolve this. Right key takes
              // priority, but we want to do a smart merge so if it's found that
              // both sides are an object then we will recursively merge them.
              fer.value(config_left[key], ['command']).then(function(left_value) {
                fer.value(config_right[key], ['command']).then(function(right_value) {
                  if (
                    (typeof(left_value) === 'object' && typeof(left_value.forEach) !== 'undefined') &&
                    (typeof(right_value) === 'object' && typeof(right_value.forEach) === 'undefined')
                  ) {
                    // try to resolve an array and an object by adding the object
                    // to the array.
                    config_left[key].push(right_value);
                    _deferred.resolve();
                  } else if (
                    (typeof(left_value) === 'object' && typeof(left_value.forEach) === 'undefined') &&
                    (typeof(right_value) === 'object' && typeof(right_value.forEach) !== 'undefined')
                  ) {
                    // try resolve an object and an array by converting the object
                    // to an array and merging the two arrays
                    config_left[key] = [config_left[key]].concat(right_value);
                    _deferred.resolve();
                  } else if (
                    typeof(left_value) === 'object' &&
                    typeof(right_value) == 'object'
                  ) {
                    // both sides are objects, but we need to check what type of
                    // objects they are first.

                    if (left_value.forEach && right_value.forEach) {
                      // look for duplicate values and remove them
                      var uValues = [];
                      var nConfig = left_value.concat(right_value);
                      nConfig.forEach(function(value) {
                        if (uValues.indexOf(value) === -1) {
                          uValues.push(value);
                        }
                      });
                      config_left[key] = uValues;
                      _deferred.resolve();
                    } else {
                      // Ooooh boy .. both sides are dictionaries. Ok, let's
                      // recursively merge them ..
                      Construct(left_value, right_value).then(function(left_value) {
                        // should be safe to override the left value now
                        config_left[key] = left_value;
                        _deferred.resolve();
                      });
                    }
                  } else {
                    // nothing of interest, we can just replace it
                    config_left[key] = right_value;
                    _deferred.resolve();
                  }
                });
              });
            } else {
              fer.value(config_right[key], ['command']).then(function(value) {
                config_left[key] = value;
                _deferred.resolve();
              });
            }
          }).then(function() {
            deferred.resolve(config_left);
          });
        });
      });
    });
  }

  return Construct;
};