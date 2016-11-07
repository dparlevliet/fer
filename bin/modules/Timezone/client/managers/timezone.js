/* global fer */

var Timezone = (function() {

  /**
   * Example:
     timezone: 'Australia/Melbourne', # https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  */

  function Timezone(config, callback) {
    fer.value(config).then(function(timezone) {
      fer.command(
        [
          "echo '{1}' | sudo tee /etc/timezone".format(timezone),
          'dpkg-reconfigure -f noninteractive tzdata',
        ],
        true
      ).then(function() {
        callback();
      });
    });
  } // Timezone

  return Timezone;
}());


module.exports = {
  help: function() {
    return fer.fs.readFileSync(__dirname + '/../help/timezone.txt').toString();
  },
  run_at: function() {
    return fer.base_run_at + 6;
  },
  cls: Timezone
};