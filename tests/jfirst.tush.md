# `jfirst`

`jfirst` is essentially identical to [`jwhere`](jwhere.tush.md), except that it only returns the first array element that matches your predicate:

```sh
$ echo '[{"i": 1}, {"i": 3}, {"i": 5}]' | jfirst -p 'i > 2'
| {
|     "i": 3
| }
```

The predicate is optional. If it is omitted, `jfirst` returns the first element of the input array:

```sh
$ echo '[[0], [1], [2]]' | jfirst
| [0]
```

If no elements match your predicate, no output is produced:

```sh
$ echo '[{"name": "Glob"}, {"name": "Grod"}]' | jfirst 'name.length > 4'
```

If the input is not an array, it is first converted to a one-element array, and then treated as usual:

```sh
$ echo '{"name": "Joe", "age": 32}' | jfirst 'age < 40'
| {"name":"Joe","age":32}
```
