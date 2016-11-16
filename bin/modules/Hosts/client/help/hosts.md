# hosts
Install hosts in to ``/etc/hosts``

# All options
```js
{
  hosts: {
    '127.0.0.1': [
      'tests-url.com'
    ],
    '127.0.1.1': null, // remove hosts attached to this ip
  }
}
```