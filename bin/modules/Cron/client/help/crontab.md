# crontab
Install/remove crontab jobs

# All options
```js
{
  crontab: {
    // Create /etc/cron.d/test_file, with the following contents
    file_name: [
      // vvvvvvvvv frequency setting
      //           vvvv which user to run as
      //                vvvvvvvvv command to run
      '*/1 * * * * root /bin/true',
    ],
    old_filename: null, // remove file
  },
}
```