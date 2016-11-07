var Q = require('q');
module.exports = function(f) {
  var deferred = Q.defer();
  f(deferred);
  return deferred.promise;
}