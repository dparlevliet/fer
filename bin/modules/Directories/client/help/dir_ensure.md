# dir_ensure
Ensure a directory exists and that the modes are correct

# All options
```js
{
  dir_ensure: {
    '/tmp/test': {
      dir_mode: '0750', // ensure the mode of the root directory ``/tmp/test``
      mode: '0640', // the mode of all sub files/folders
      owner: 'root', // the owner
      group: 'root', // the group
      command: function() { // the command to run if any changes were made
        return fer.do(function(deferred) {
          // do something here
          deferred.resolve();
        });
      },
    }
  },
}
```