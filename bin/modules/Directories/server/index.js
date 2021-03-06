/* global fer */
module.exports = {
  handles: {
    dir_install: [
      {
        method: 'get',
        uri: 'check',
        callback: function(req, res) {
          console.log(req);
          if (!req.query.source) {
            return res.status(404).send('Not found');
          }
          var source = global.__basedir + '/usr/files/' + req.query.source.replace(/[\.]+\//g, '');
          try {
            if (global.FileUtils.stat(source).isDirectory()) {
              global.FileUtils.walkSumList([
                source
              ]).then(function(list) {
                var fileList = list[0];
                fileList.forEach(function(file, index) {
                  fileList[index].path = ((file.path.replace(global.__basedir, '')).replace('/usr/files', '')).replace('//', '/');
                });
                res.send(JSON.stringify(fileList));
              });
            } else {
              res.status(404).send('Not found');
            }
          } catch (e) {
            console.log(e);
            res.status(404).send('Not found');
          }
        }
      }
    ],
  },
};