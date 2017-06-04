# `jcount`

Much like [`jwhere`](jwhere.tush.md), [`jcount`](../README.md#jcount) is concerned with array elements that match a predicate. However, unlike `jwhere`, `jcount` does not return them; it just returns a count of how many elements match:

```sh
$ echo '[{"i": 1}, {"i": 3}, {"i": 5}]' | jcount 'i > 2'
| 2
```

The predicate is optional. If omitted, `jcount` returns the length of the input array:

```sh
$ echo '[0,1,2,3]' | jcount
| 4
```

If the input is not an array, it is converted to a one-element array and processing proceeds as normal:

```sh
$ echo '{}' | jcount
| 1
```
