# `jwhere`

Assuming your input is an array, `jwhere` iterates over each element in the input and returns any objects that match the predicate you provide. The predicate is executed in a similar context to that of [`jutil`](../README.md#jutil), but must be an expression and not a full program. The `return` statement is explicit.

```sh
$ echo '[{"i": 1}, {"i": 3}, {"i": 5}]' | jwhere -p 'i > 2'
| [
|     {
|         "i": 3
|     },
|     {
|         "i": 5
|     }
| ]
```

Any truthy value is considered a match:

```sh
$ echo '[{"name": "Glob"}, {"name": "Grod"}, {"name": ""}]' | jwhere 'name'
| [{"name":"Glob"},{"name":"Grod"}]
```

If no objects in the input match, the empty array [] is returned.

```sh
$ echo '[{"name": "Glob"}, {"name": "Grod"}]' | jwhere 'name.length > 4'
| []
```

If you need to refer to each array element as a whole, use the `$` variable:

```sh
$ echo '["Glob", "Grod", "Blob"]' | jwhere '$.charAt(0) == "B"'
| ["Blob"]
```

This means a predicate of `$` can be used to select truthy values out of the input:

```sh
$ echo '[0, 1, false, true, [], {}]' | jwhere '$'
| [1,true,[],{}]
```

If the input is not an array, it is converted to a one-element array:

```sh
$ echo '{"name": "Joe", "age": 32}' | jwhere 'age < 40'
| [{"name":"Joe","age":32}]
```
