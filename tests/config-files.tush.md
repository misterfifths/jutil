# Config Files

Exercising some edge cases and obscure uses of config files. This test has its own batch of configuration files. Let's move those into place:

```sh
$ cp -r "$FIXTURE_DIR"/config-tests/* .
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

Nonexistent configuration files are ignored silently, and the default configuration is used:

```sh
$ echo '{}' | jutil -c nonexistent-config
| {}
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