# `jsort`

[`jsort`](../README.md#jsort) is used to sort arrays based on a key expression you provide:

```sh
$ echo '[{"name": "Joan", "age": 25}, {"name": "Bette", "age": 17}]' | jsort -p age
| [
|     {
|         "name": "Bette",
|         "age": 17
|     },
|     {
|         "name": "Joan",
|         "age": 25
|     }
| ]
```

The key expression is optional, and defaults to the entire object (`$`). This is useful for sorting arrays of strings or numbers:

```sh
$ echo '["lamb", "sheep", "goose"]' | jsort
| ["goose","lamb","sheep"]
```

You can sort in reverse (descending) order by specifying the `-r` option:

```sh
$ echo '["lamb", "cow", "goose"]' | jsort -r '$.length'
| ["goose","lamb","cow"]
```

If your key expression results in a string, you can sort in a case-insensitive manner by providing the `-i` option:

```sh
$ echo '["lamb", "Cow"]' | jsort -i
| ["Cow","lamb"]
```

If your input is not an array, it is converted to a one-element array and processed as normal:

```sh
$ echo '{"time": "15:30"}' | jsort
| [{"time":"15:30"}]
```
