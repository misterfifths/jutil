# Argument parsing odds and ends

Nothing particularly intersting in here; just exercising some edge cases of the argument parsing code.

Tools like `jutil` that accept an optional positional argument should accept zero or one arguments, but no more:

```sh
$ echo '[1]' | jutil 
| [1]

$ echo '[1]' | jutil 'return $'
| [1]

$ set -o pipefail; echo '[1]' | jutil 'return $' 'nonsense' 2>&1 | head -n1 1>&2
@ Error: Expected at most 1 argument(s), but got 2
? 1
```

Tools like `jselect` should require exactly one argument:

```sh
$ set -o pipefail; echo '[1]' | jselect 2>&1 | head -n1 1>&2
@ Error: Expected at least 1 argument(s), but got 0
? 1

$ echo '[1]' | jselect '{value: $}'
| [{"value":1}]

$ set -o pipefail; echo '[1]' | jselect '{value: $}' 'nonsense' 2>&1 | head -n1 1>&2
@ Error: Expected at most 1 argument(s), but got 2
? 1
```

`jprops` should require at least one argument, but accept an unlimited number:

```sh
$ set -o pipefail; echo '{"x": 2}' | jprops 2>&1 | head -n1 1>&2
@ Error: Expected at least 1 argument(s), but got 0
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
$ echo '[]' | jutil 'return $' --help 2>&1 | head -n1 1>&2
@ $(jutil --help 2>&1)
```