# Argument parsing odds and ends

Nothing particularly interesting in here; just exercising some edge cases of the argument parsing code.

Tools like `jutil` that accept an optional positional argument should accept zero or one arguments, but no more:

```sh
$ echo '[1]' | jutil 
| [1]

$ echo '[1]' | jutil 'return $'
| [1]

$ echo '[1]' | jutil 'return $' 'nonsense'
@ Error: Expected at most 1 argument(s), but got 2
@ 
@ $(jutil --help 2>&1)
? 1
```

Tools like `jselect` should require exactly one argument:

```sh
$ echo '[1]' | jselect
@ Error: Expected at least 1 argument(s), but got 0
@ 
@ $(jselect --help 2>&1)
? 1

$ echo '[1]' | jselect '{value: $}'
| [{"value":1}]

$ echo '[1]' | jselect '{value: $}' 'nonsense'
@ Error: Expected at most 1 argument(s), but got 2
@ 
@ $(jselect --help 2>&1)
? 1
```

`jprops` should require at least one argument, but accept an unlimited number:

```sh
$ echo '{"x": 2}' | jprops
@ Error: Expected at least 1 argument(s), but got 0
@ 
@ $(jprops --help 2>&1)
? 1

$ echo '{"x": 2}' | jprops x
| {"x":2}

$ echo '{"x": 2, "y": 3}' | jprops x y
| {"x":2,"y":3}

$ echo '{"x": 2, "y": 3, "z": 4}' | jprops x y z
| {"x":2,"y":3,"z":4}
```

Passing `--help` should show usage and ignore all other arguments:

```sh
$ echo '[]' | jutil 'return $' --help
@ $(jutil --help 2>&1)
```

Passing nothing to an argument that requires a value should show an error and usage:

```sh
$ jutil -f
@ Error: do not have enough args for "-f" option
@ 
@ $(jutil --help 2>&1)
? 1
```

Passing an invalid value to an argument that expects a specific set of options (like `--color`) should show an error and usage:

```sh
$ jutil --color=no-thanks
@ Error: argument for --color is not valid
@ 
@ $(jutil --help 2>&1)
? 1
```