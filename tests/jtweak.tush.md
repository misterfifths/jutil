# `jtweak`

This command allows you to modify your input data in-place using a script. Any changes your script makes to `$` are propagated to the output. So, you can add new properties:

```sh
$ echo '{"x": 2}' | jtweak '$.sqrt = Math.sqrt(x)'
| {"x":2,"sqrt":1.4142135623730951}
```

Delete existing properties:

```sh
$ echo '{"x": 1, "y": 3}' | jtweak 'delete x'
| {"y":3}
```

Modify existing properties:

```sh
$ echo '{"x": 2, "y": 3}' | jtweak 'x = y + 1'
| {"x":4,"y":3}
```

Or completely reassign `$`:

```sh
$ echo '{"x": 3}' | jtweak '$ = {"y": 8}'
| {"y":8}
```

If your input is an array, the script you provide is executed for each object in the array, and the results are collected in the ouput:

```sh
$ echo '[1, 2, 3]' | jtweak '$ += 8'
| [9,10,11]
```
