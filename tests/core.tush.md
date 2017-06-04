# Core Functionality

This file contains tests of functionality that is shared among all (or most) of the tools in the jutil suite. It can be run using the `run_tests` script. If all tests pass, no output should be produced.

Before we get started, it's worth noting that the `run_tests` script sets the `JUTIL_CONFIG_PATH` environmental variable to point to a blank [configuration file](../README.md#config-files) to ensure we're using default options.

For convenience, we're going to copy all the [support files](fixtures) for the tests into the test directory:

```sh
$ cp -r "$FIXTURE_DIR"/* .
```

## Input

Input is accepted from stdin by default, and pretty-printing should is off if we're not writing to a terminal. Using `jutil` with no arguments acts as a JSON-validating passthrough.

```sh
$ echo '[1, 2]' | jutil
| [1,2]
```

You can read input from a file with the `-f` option.

```sh
$ jutil -f array_1-3.json
| [1,2,3]
```

Invalid JSON causes an error which shows you the input so you can diagnose the problem. This is useful if you're piping directly from `curl`, for instance.

```sh
$ echo '{' | jutil
@ Error parsing input: SyntaxError: Unexpected end of JSON input.
@ Input:
@ {
@ 
? 1
```

## Pretty-printing and key sorting

You can force pretty-printing with `-p`. Note that most of the time you won't need this argument, since you'll be using `jutil` interactively. It's only needed in these tests because the test runner redirects output to a file.

```sh
$ echo '[1, 2]' | jutil -p
| [
|     1,
|     2
| ]
```

An object's keys are unsorted by default:

```sh
$ echo '{"b": 1, "a": 2}' | jutil -p
| {
|     "b": 1,
|     "a": 2
| }
```

But we can force key sorting with `-s`, which is useful for making sure results are reproducible.

```sh
$ echo '{"b": 1, "a": 2}' | jutil -p -s
| {
|     "a": 2,
|     "b": 1
| }
```

Key sorting is recursive:

```sh
$ echo '{"b": {"b1": 3, "b2": 4}, "a": {"a2": 2, "a1": 1}}' | jutil -ps
| {
|     "a": {
|         "a1": 1,
|         "a2": 2
|     },
|     "b": {
|         "b1": 3,
|         "b2": 4
|     }
| }
```

But note that `-s` has no effect on arrays, since their order may be important:

```sh
$ echo '[2, 1]' | jutil -s
| [2,1]
```

To sort arrays, use the [`jsort`](../README.md#jsort) command.

## Configuration Files

A [configuation file](../README.md#config-files) is loaded from `~/.jutil/config` by default. One can also be specified via the command line argument `-c`. Here we're loading [one](fixtures/sort_and_pretty_print_config) that effectively turns on `-p` and `-s`.

```sh
$ echo '{"b": 1, "a": 2}' | jutil -c sort_and_pretty_print_config
| {
|     "a": 2,
|     "b": 1
| }
```

You can also set a configuration file via environmental variable:

```sh
$ echo '{"b": 1, "a": 2}' | JUTIL_CONFIG_PATH="$FIXTURE_DIR/sort_and_pretty_print_config" jutil
| {
|     "a": 2,
|     "b": 1
| }
```

Errors in configuration files raise an error from jutil:

```sh
$ echo '{}' | jutil -c config-with-error
@ Error loading configuration file: ReferenceError: garbage is not defined
? 1
```

Configuration files that don't create the mandatory `config` variable result in a warning:

```sh
$ echo '{}' | jutil -c invalid-config
| {}
@ Warning: config file must assign to the global "config" var; ignoring the file
```

Nonexistent configuration files are ignored silently, and the default configuration is used:

```sh
$ echo '{}' | jutil -c nonexistent-config
| {}
```

## Unwrapping

With some frequency, you may want to operate on just one property of the incoming JSON document. [Unwrapping](../README.md#unwrapping) helps in this case.

### Basic

You can enable automatic smart unwrapping with `-a`. The algorithm is not particularly smart. If the incoming data has only one property, and the property is an object, it is used:

```sh
$ echo '{ "payload": [1, 2, 3] }' | jutil -a
| [1,2,3]
```

If there is only one property, but it is a primitive or null, `-a` does nothing:

```sh
$ echo '{ "payload": 5 }' | jutil -a
| {"payload":5}
```

If you know the name of the property you wish to unwrap, you can specify it with `-u`:

```sh
$ echo '{ "meta": 3, "payload": [1, 2] }' | jutil -u payload
| [1,2]
```

### Via `autoUnwrapProperties` in config

If you frequently deal with data that needs unwrapping via `-u`, you can specify a prioritized list of property names to try in a configuration file. Assign an array of strings to the `autoUnwrapProperties` key of the `config` object, and each will be tried in order against incoming data when you specify `-a`. [Here](fixtures/unwrap-properties-config)'s an example configuration file.

```sh
$ echo '{ "meta": 3, "second": [1] }' | jutil -c unwrap-properties-config -a
| [1]
```

The properties listed in `autoUnwrapProperties` are used in order until one produces an object:

```sh
$ echo '{ "first": [2], "second": [1] }' | jutil -c unwrap-properties-config -a
| [2]
```

If none of the properties are found, the object is passed through unchanged:

```sh
$ echo '{ "oops": 2, "wildcard": [] }' | jutil -c unwrap-properties-config -a
| {"oops":2,"wildcard":[]}
```

Similarly:

```sh
$ echo '{}' | jutil -c unwrap-properties-config -a
| {}
```

### Via `autoUnwrapper` in config

If you require more control over the behavior of `-a`, you can replace its behavior by writing an `autoUnwrapper` function in your config file. In [this](fixtures/custom-unwrapper) config file, we're using an unwrapper that picks the first property of the incoming data alphabetically:

```sh
$ echo '{ "b": [2], "a": [1] }' | jutil -c custom-unwrapper -a
| [1]
```

## Scripts

The [`script` subcommand](../README.md#jutil), usually accessed by just running `jutil`, is the most basic tool in the suite. It simply runs a script specified on the command line and outputs the result as JSON:

```sh
$ echo '{}' | jutil 'return { hello: "world" }'
| {"hello":"world"}
```

For longer scripts, or those that you use repeatedly, you may also pass the name of a script file to the `-i` argument. For example, [simple-script.js](fixtures/simple-script.js) is a multiline script that includes a helper function:

```sh
$ echo '[[1], [2]]' | jutil -i simple-script.js
| [4]
```

However, you may not use both `-i` and an inline script at the same time:

```sh
$ echo '{}' | jutil -i simple-script 'return [1]'
@ Error: You cannot specify both a script file (-i/--script) and an inline script.
? 1
```

Script errors are reported on the command line:

```sh
$ echo '{}' | jutil 'nonsense'
@ Error running script: ReferenceError: nonsense is not defined
? 1
```

### Interacting with data

To access the incoming JSON data in a script, use the variable `$`:

```sh
$ echo '[[1], [2]]' | jutil 'return $[1]'
| [2]
```

In all commands that take a script, `$$` refers to the entire incoming JSON document (after any [unwrapping](#unwrapping)). For `jutil` (AKA `jutil script`), `$` and `$$` are equivalent:

```sh
$ echo '[[1], [2]]' | jutil 'return $$[1]'
| [2]
```

This is not the case with other commands, where `$` can represent individual elements of an incoming array.

So, the examples we've seen thus far of running `jutil` without a script are equivalent to running it with `return $$`:

```sh
$ echo '[[1], [2]]' | jutil 'return $$'
| [[1],[2]]
```

### `with` statement

By default, scripts run inside of a `with($)` statement. This means you can access properties of the data by just naming them; you don't have to use `$.`:

```sh
$ echo '{ "convenient": [1, 2] }' | jutil 'return convenient'
| [1,2]
```

Sometimes, if your data has a property that has a conflicting name with some other function or variable, this functionality may be undesirable. You can disable the `with` statement using the `-W` option:

```
$ echo '{ "convenient": [1, 2] }' | jutil -W 'return convenient'
@ Error running script: ReferenceError: convenient is not defined
? 1
```

## Modules

You can load simple [modules](../README.md#modules) into the jutil environment. These take the form of a number of Javascript files (or a directory of them). Any global variables or functions in the files will become available in a script executed by jutil.

For example, the [md5.js](fixtures/modules/md5.js) file contains a function, `$md5`, that computes the MD5 hash of a given string and returns it as a base-64 encoded string. If we load it with the `-m` option, we can use the function in our scripts:

```sh
$ echo '{ "hashme": "hello" }' | jutil -m modules/md5.js 'return { hash: $md5(hashme) }'
| {"hash":"XUFAKrxLKna5cZ2REBfFkg=="}
```

The `-m` option can be repeated to load multiple modules:

```sh
$ echo '{ "hashme": "hello" }' | jutil -m modules/md5.js -m modules/not-underscore.js 'return _($md5(hashme))'
| {"under":"XUFAKrxLKna5cZ2REBfFkg=="}
```

You can load a directory full of modules with the `-M` option. This loads all `.js` files in the directory.

```sh
$ echo '{ "hashme": "hello" }' | jutil -M modules 'return _($md5(hashme))'
| {"under":"XUFAKrxLKna5cZ2REBfFkg=="}
```

By default, `jutil` loads modules from `~/.jutil/modules`.

Modules with errors result in a warning:

```sh
$ echo '{}' | jutil -m broken-module.js
| {}
@ Warning: error loading module "broken-module.js": ReferenceError: nope is not defined
```
