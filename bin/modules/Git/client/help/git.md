# git
Clone or pull a git repository as a particular user

# All options
```js
{
  git: {
    '/root/fer': {
      'source': 'https://www.github.com/dparlevliet/fer.git',
      'branch': 'master',
      'run_as': 'www-data',
      'command': function() { // command to run after clone/pull
        // Note: this will run every time regardless
        return fer.do(function(deferred) {
          return deferred.resolve();
        });
      }
    },
  },
}
```