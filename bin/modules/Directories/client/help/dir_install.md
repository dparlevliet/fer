# dir_install
Install a directory from the fer server to the local server

# All options
```js
{
  dir_install: {
    '/tmp/test': {
      source: 'fer://test',
      dir_mode: '0750', // byte permissions of the root directory ``/tmp/test``
      mode: '0640', // byte permissions of the files in the directory
      owner: 'root', // owner of the all the files/folders
      group: 'root', // group owner of all the files/folders
      command: function() { // command to run when a new file is installed
        return fer.do(function(deferred) {
          // do something here
          deferred.resolve();
        });
      },
    }
  },
}
```