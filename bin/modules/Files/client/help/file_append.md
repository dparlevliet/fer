# file_append
Appends to locations on your server

# All options
```js
{
  file_append: {
    '/etc/aliases': [
      {
        add: "root: root@yourdomain.com",  // The line to add
        match: /^root/,                    // Replace any and all lines matching this regex
        command: "newaliases",             // Run this if the file is changed
        create: true,                      // Create the file if it doesn't already exist
      },
    ],
  },
}
```