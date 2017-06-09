# `jcat`

[`jcat`](../README.md#jcat) joins JSON files together. The files are specified in a list at the end of the command. Arrays are concatenated:

```sh
$ jcat array_1-3.json array_4-5.json
| [1,2,3,4,5]
```

Thanks to the magic of the shell, you can use wildcards to join many files:

```sh
$ jcat array_*.json | jsort
| [1,1,2,2,3,3,4,4,5,5]
```

Objects are treated slightly differently. If only one input file is provided, the object in it is passed through unchanged:

```sh
$ jcat -p person-1.json
| {
|     "name": "Joan",
|     "age": 27
| }
```

However, if multiple input files are provided, the objects in each are added to an array:

```sh
$ jcat -p person-1.json person-2.json
| [
|     {
|         "name": "Joan",
|         "age": 27
|     },
|     {
|         "name": "Gio",
|         "age": "41"
|     }
| ]
```

You can mix and match array and object inputs, though that's probably going to result in some weird data:

```sh
$ jcat -p array_1-3.json person-1.json
| [
|     1,
|     2,
|     3,
|     {
|         "name": "Joan",
|         "age": 27
|     }
| ]
```

It is an error to specify a nonexistent file:

```sh
$ jcat nonexistent.json
@ Error: Unable to load file "nonexistent.json": Error: ENOENT: no such file or directory, open 'nonexistent.json'
? 1
```
