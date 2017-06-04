# `jselect`

Assuming your input is an array, [`jselect`](../README.md#jselect) evaluates a given expression and collects the result in an array. That is, it essentially does `Array.map` over your array with an expression you provide.

```sh
$ echo '[{"x": 1, "y": 2}, {"x": 2, "y": 3}]' | jselect -p '{x: x, y: y, sum: x + y}'
| [
|     {
|         "x": 1,
|         "y": 2,
|         "sum": 3
|     },
|     {
|         "x": 2,
|         "y": 3,
|         "sum": 5
|     }
| ]
```

If your input is not an array, it is converted to a one-element array and processing proceeds as normal:

```sh
$ echo '{"name":"Bea"}' | jselect '{name: name.toLowerCase()}'
| [{"name":"bea"}]
```
