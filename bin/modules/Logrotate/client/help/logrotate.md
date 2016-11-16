# logrotate
Manage lograte config

# All options
```js
{
  // See: https://linux.die.net/man/8/logrotate
  logrotate: {
    '/var/log/auth.log': { // path of the log to watch and rotate
      daily: true,  // Could be daily, monthly, weekly, yearly
      compress: 3,
      missingok: true,
      notifempty: true,
      delaycompress: true,
      sharedscripts: true,
      rotate: 10,
      size: '10M',
      create: '0700 root root',
      postrotate: "ls -l /var/log/foo.* > /tmp/foologfiles",
      prerotate: "ls -l /var/log/foo.* > /tmp/foologfiles",
    },
  },
}
```