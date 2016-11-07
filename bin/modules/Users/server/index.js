/* global fer */

module.exports = {
  handles: {
    user: [
      {
        method: 'get',
        uri: 'get-public-key',
        callback: function(req, res) {
          try {
            fer.FileUtils.readlines(
              fer.base_dir+'/usr/ssh_keys'
            ).then(function(lines) {
              var found = false;
              lines.forEach(function(line) {
                if (line.indexOf(req.query.key) > -1) {
                  found = line;
                }
              });
              if (!found) {
                return res.status(404).send('Not found');
              }
              res.send(found);
            });
          } catch (e) {
            console.log(e);
            res.status(404).send('Not found');
          }
        }
      }
    ],
  },
};