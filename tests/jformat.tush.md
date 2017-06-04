# `jformat`

[`jformat`](../README.md#jformat) allows you to interpolate values from your input data into non-JSON strings. It loops over every element of the input, expands your format string, and outputs the result. Replacement strings in the format string can take the form of `%propertyName`. A simple example:

```sh
$ echo '[{"name": "Joan", "age": 25}, {"name": "Bette", "age": 17}]' | jformat '%name is %age years old.'
| Joan is 25 years old.
| Bette is 17 years old.
```

More complicated replacements (those that involve expressions or special characters) take the form `%{expression}`. For example:

```sh
$ echo '[[1,2], [3,4]]' | jformat '%{$[0]} + %{$[1]} = %{$[0] + $[1]}'
| 1 + 2 = 3
| 3 + 4 = 7
```

By default, lines of the output are separated with a newline. You can disable that behavior with `-n`:

```sh
$ echo '[1,2,3,4,5]' | jformat -n '%{$}-'
| 1-2-3-4-5-
```

The special strings `\n`, `\t` and `\r` are expanded in format strings:

```sh
$ echo '[1,2,3]' | jformat -n '\t%{$}\n'
| 	1
| 	2
| 	3
```

If you need to print a header before your custom output, use the `-H` option. In the format string for `-H`, `$` refers to the entire data. For example, here's a naive table:

```sh
$ echo '[{"name": "Joan", "age": 25}, {"name": "Bette", "age": 17}]' | jformat -H 'Name    Age\n-----------' '%{name.padEnd(7)} %{age.toString().padStart(3)}'
| Name    Age
| -----------
| Joan     25
| Bette    17
```

Similarly, you can add a footer with -F:

```sh
$ echo '[{"name": "Joan", "age": 25}, {"name": "Bette", "age": 17}]' | jformat -F '%{$.length} people total.' '%name is %age years old.'
| Joan is 25 years old.
| Bette is 17 years old.
| 2 people total.
```

If your input is not an array, the format string is evaluated against it as-is:

```sh
$ echo '{"x": 45}' | jformat '%x^3 = %{Math.pow(x, 3)}'
| 45^3 = 91125
```

The special values `null` and `undefined` are turned into string versions of themselves if they are present in a format string:

```sh
$ echo '{"x": null}' | jformat '%x %{x} %{$.y}'
| null null undefined
```
