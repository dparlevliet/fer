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
          keys.forEach(function(key, offset) {
            var try_resolve = function() {
              if (keys.length - 1 == offset) {
                deferred.resolve(config_left);
              }
            };

            // check to see if this key (on the right side) is found to the left
            if (typeof(config_right[key]) === 'function' || typeof(config_left[key]) === 'function') {
              config_left[key] = config_right[key];
              try_resolve();
            } else if (typeof(config_left[key]) !== 'undefined') {
              // conflicting keys found, we need to resolve this. Right key takes
              // priority, but we want to do a smart merge so if it's found that
              // both sides are an object then we will recursively merge them.
              fer.value(config_left[key], ['command']).then(function(left_value) {
                fer.value(config_right[key], ['command']).then(function(right_value) {
                  if (
                    typeof(left_value) === 'object' &&
                    typeof(right_value) == 'object'
                  ) {
                    // both sides are objects, but we need to check what type of
                    // objects they are first.

                    if (left_value.forEach && right_value.forEach) {
                      // both sides are standard arrays, we can just concat them
                      config_left[key] = left_value.concat(right_value);
                      try_resolve();
                    } else {
                      // Ooooh boy .. both sides are dictionaries. Ok, let's
                      // recursively merge them ..
                      Construct(left_value, right_value).then(function(left_value) {
                        // should be safe to override the left value now
                        config_left[key] = left_value;
                        try_resolve();
                      });
                    }
                  } else {
                    // nothing of interest, we can just replace it
                    config_left[key] = right_value;
                    try_resolve();
                  }
                });
              });
            } else {
              fer.value(config_right[key], ['command']).then(function(value) {
                config_left[key] = value;
                try_resolve();
              });
            }
          });
        });
      });
    });
  }

  return Construct;
};