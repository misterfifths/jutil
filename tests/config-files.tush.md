# Config Files

Exercising some edge cases and obscure uses of config files. This test has its own batch of configuration files. Let's move those into place:

```sh
$ cp -r config-files/* .
```

## Errors

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

Nonexistent configuration files from an environmental variable are ignored silently, and the default configuration is used:

```sh
$ echo '{}' | JUTIL_CONFIG_PATH="$(pwd)/nonexistent-config" jutil
| {}
```

But nonexistent configuration files explicitly passed on the command line result in a warning:

```sh
$ echo '{}' | jutil -c nonexistent-config
| {}
@ Warning: unable to load configuration file "nonexistent-config"
```

## Type Warnings

Some configuration options must be booleans:

```sh
$ echo '{}' | jutil -c type-mismatch-bool
| {}
@ Warning: alwaysAutoUnwrap property in config file must be a boolean; ignoring the setting
```

Others must be arrays of strings:

```sh
$ echo '{}' | jutil -c type-mismatch-str-array
| {}
@ Warning: autoUnwrapProperties property in config file must contain only string elements; ignoring the setting

$ echo '{}' | jutil -c type-mismatch-str-array-2
| {}
@ Warning: autoUnwrapProperties property in config file must be an array; ignoring the setting
```

Still others must be functions:

```sh
$ echo '{}' | jutil -c type-mismatch-fn
| {}
@ Warning: autoUnwrapper property in config file must be a function; ignoring the setting
```

Functions must take a certain number of arguments to be considered valid:

```sh
$ echo '{}' | jutil -c arity-mismatch
| {}
@ Warning: autoUnwrapper function in config file must take exactly 2 arguments; ignoring the setting
```

The `prettyPrintIndent` option can be either a string or an integer, but no other type:

```sh
$ echo '[1, 2]' | jutil -c pretty-print-indent-int -p
| [
|   1,
|   2
| ]

$ echo '[1, 2]' | jutil -c pretty-print-indent-str -p
| [
| -1,
| -2
| ]

$ echo '[1, 2]' | jutil -c pretty-print-indent-bad -p
| [
|     1,
|     2
| ]
@ Warning: prettyPrintIndent property in config file must be a number or string; ignoring the setting
```

## Custom values

Custom properties in the config file are copied verbatim and available through the `$config` variable in the script environment:

```sh
$ echo '{}' | jutil -c custom-value 'return $config.myValue'
| 3.14159
```

## Overriding config values

For options that are enabled in the configuration file but also available on the command line, you can override the configuration file by passing `--no-<option name>`. For instance:

```sh
$ echo '{"b": 1, "a": 2}' | jutil -c sort_and_pretty_print_config --no-sort-keys
| {
|     "b": 1,
|     "a": 2
| }

$ echo '[1]' | jutil -c sort_and_pretty_print_config --no-pretty-print
| [1]

$ echo '{ "payload": [1, 2, 3] }' | jutil -c always-auto-unwrap-config --no-auto-unwrap
| {"payload":[1,2,3]}

$ echo '{"x": 2}' | jutil -c disable-with-clause-config --no-disable-with 'return x'
| 2
```

If you need to forcefully disable module directory loading, even if it's specified in your config file, use `--no-module-dir`:

```sh
$ echo '{ "hashme": "hello" }' | jutil -c module-dirs-config --no-module-dir 'return _($md5(hashme))'
@ Error running script: ReferenceError: _ is not defined
? 1
```

You can also use `--no-config-file` to completely disable the loading of a configuration file, even if one is specified in your environment.

```sh
$ echo '{"b": 1, "a": 2}' | JUTIL_CONFIG_PATH="$(pwd)/sort_and_pretty_print_config" jutil --no-config-file
| {"b":1,"a":2}
```