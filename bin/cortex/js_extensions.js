/*******************************************************************************
 * Add format() to strings
 *
 * Source: http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
 */

String.prototype.format = function() {
  var formatted = this.toString();
  for (var i = 0; i < arguments.length; i++) {
    var regexp = new RegExp('\\{'+(Number(i)+1)+'\\}', 'gi');
    formatted = formatted.replace(regexp, arguments[''+i]);
  }
  return formatted;
};