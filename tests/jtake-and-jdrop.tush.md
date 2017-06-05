# `jtake` and `jdrop`

These tools are more tailored versions of the functionality of [`jfirst`](jfirst.tush.md). They let you select or remove, respectively, records from your input:

```sh
$ echo '[1, 2, 3, 4, 5]' | jtake 3
| [1,2,3]
```

Or,

```sh
$ echo '[1, 2, 3, 4, 5]' | jdrop 2
| [3,4,5]
```

You can use the `-e` flag to have the tools operate from the end of the input, rather than the beginning:

```sh
$ echo '[1, 2, 3, 4, 5]' | jtake -e 2
| [4,5]
```

Or,

```sh
$ echo '[1, 2, 3, 4, 5]' | jdrop -e 1
| [1,2,3,4]
```

If you try to take more records than are in the input, the entire input is returned:

```sh
$ echo '[1, 2, 3]' | jtake 100
| [1,2,3]
```

And if you try to drop more records than are in the input, the empty array is returned:

```sh
$ echo '[1, 2, 3]' | jdrop 5
| []
```

If your input is not an array, it is converted to a single-element array and then processed as normal:

```sh
$ echo '{"name": "Yoni"}' | jtake 1
| [{"name":"Yoni"}]

$ echo '{"name": "Yoni"}' | jdrop 1
| []
```

The argument you pass must a valid integer:

```sh
$ echo '{}' | jtake a
@ Invalid count parameter: "a". Expected an integer.
? 1

$ echo '{}' | jdrop 'x == 2'
@ Invalid count parameter: "x == 2". Expected an integer.
? 1
```

Note that unlike `jfirst`, `jtake` and `jdrop` do not accept a predicate. To select or remove a number of records that match some predicate, pipe the output of `jwhere` into one of these tools.
