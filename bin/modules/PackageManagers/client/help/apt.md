# apt
Install packages via apt

# All options
```js
{
  apt: {
    always_update: false,   // always run ``apt-get update`` when fer runs
                            // if false, it will run it once per 24 hours
    always_upgrade: false,  // always run ``apt-get upgrade`` when fer runs
                            // if false it will run it once per 24 hours
    deb_options: [ // deb_options to add before it installs packages
      "mariadb-server-5.5 mysql-server/root_password password asdf",
    ],
    packages: [ // installs packages via apt-get install <packages>
      'mariadb-server-5.5',
    ],
    purge: [ // runs apt-get remove --purge <packages>
      'mariadb-server-5.1',
    ],
    remove: [ // runs apt-get remove <packages>
      'mariadb-server-5.1',
    ],
  },
}
```

