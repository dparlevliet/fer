# file_modify
Modify the contents of a file on your server

# All options
```js
{
  file_modify: {
    '/etc/aliases': [
      {
        search: /^root\: root@yourdomain.com/,  // Regex to search for
        replace: '',                            // String to replace the pattern match with
        command: "newaliases",                  // Run this if the file is changed
      },
    ],
  },
}
```