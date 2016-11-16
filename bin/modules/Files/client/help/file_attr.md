# file_attr
Ensures the attributes of a file on the server

# All options
```js
{
  file_attr: {
    '/etc/aliases': '0644',  // the unix byte permissions as a <String>
    '/etc/test_file': {
      mode: '0644', // the unix byte permissions as a <String>
      uid: 1000, // optional - but must exist if gid is provided
      gid: 1000 // optional - but must exist if uid is provided
    },
  },
}
```