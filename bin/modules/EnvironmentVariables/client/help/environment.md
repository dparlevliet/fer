# file_install
Installs files in to locations on your server from a given source.

# All options
```js
{
  file_install: {
    '/tmp/test.txt': {
      group: 'root',
      owner: 'root',

      mode: '0740',

      source: 'fer://test_file.txt', // from fer server or http location
      text => 'Done.', // or raw text

      modify => [
        {
          search: /<[^>]+>/g,
          replace: '[\\1]'
        }
      ],

      command: function() {
        return fer.do(function(deferred) { // must be deferred
          // do something here
          deferred.resolve();
        });
      },
    },
  }
}
```

# Example #1

Install of a file located in the ``usr/files/`` path of your fer server

```js
module.exports = {
  detect: function() { ... },
  config: {
    file_install: {
      '/etc/mysql/my.cnf': {
        'source': 'fer://mysql/my.cnf', // translates to ``usr/files/mysql/my.cnf`` on the fer server - ``/../`` is not allowed in the string
        'mode': '0400',
      }
    }
  }
};
```

# Example #2

Install of a file with a specific string and run a command if it doesn't exist
or the string differs from the original file contents.

Specifically, in this instance it will write the string "migrate to v0.0.1" to
the location ``/root/fer/.migration`` and if that file didn't exist or existed
with a different string, it will run the migrate command as user ``www-data``.

Note: Using the ``modify`` param will not affect this process, and using ``modify``
to modify a file or string will not cause ``command`` to be run.

```js
module.exports = {
  detect: function() { ... },
  config: {
    file_install: {
      '/root/fer/.migration': {
        'test': 'migrate to v0.0.1',
        'mode': '0400',
        'command': function() {
          return fer.command([
            'cd /var/www/<project>',
            './migrate',
          ], false, 'www-data');
        }
      }
    }
  }
};
```

# Example #3

Run ``file_install`` at different times in the cycle process.

``!WARNING!`` It is strongly not advised to do this in any components - this
should be done at the device level config ONLY if you're in ``single_config`` mode
otherwise your config could be incorrectly built.

```js
module.exports = {
  detect: function() { ... },
  config: {
    file_install: [
      {
        'run_at': 50,
        '/etc/mysql/my.cnf': {
          'source': 'fer://mysql/my.cnf',
          'mode': '0440',
        }
      },
      {
        'run_at': 1000,
        '/root/fer/.migration': {
          'test': 'migrate to v0.0.1',
          'mode': '0400',
          'command': function() {
            return fer.command([
              'cd /var/www/<project>',
              './migrate',
            ], false, 'www-data');
          }
        }
      }
    ]
  }
};
```