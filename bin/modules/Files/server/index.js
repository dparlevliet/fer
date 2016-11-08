/* global fer */
module.exports = {
  handles: {
    file_install: [
      {
        method: 'get',
        uri: 'check',
        callback: function(req, res) {
          if (!req.query.source) {
            return res.status(404).send('Not found');
          }
          var source = 'usr/files/' + req.query.source.replace(/[\.]+\//g, '');
          try {
            if (global.FileUtils.stat(source).isDirectory()) {
              return res.status(404).send('Cannot check directory');
            }
            var md5 = '';
            var sha1 = '';
            global.FileUtils.fileMD5(source).then(function(sum) {
              md5 = sum;
              return global.FileUtils.fileSHA1(source);
            }).then(function(sum) {
              sha1 = sum;
              res.send({
                md5: md5,
                sha1: sha1,
              });
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