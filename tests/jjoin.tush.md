# `jjoin`

[`jjoin`](../README.md#jjoin) joins JSON files together. The files are specified in a list at the end of the command. Arrays are concatenated:

```sh
$ jjoin array_1-3.json array_4-5.json
| [1,2,3,4,5]
```

Thanks to the magic of the shell, you can use wildcards to join many files:

```sh
$ jjoin array_*.json | jsort
| [1,1,2,2,3,3,4,4,5,5]
```

Objects are added to an array:

```sh
$ jjoin -p person-1.json person-2.json
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
$ jjoin -p array_1-3.json person-1.json
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

