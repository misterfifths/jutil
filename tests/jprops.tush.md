# `jprops`

[`jprops`](../README.md#jprops) is intended to simplify one of the most common use cases of [`jselect`](jselect.tush.md): extracting and renaming properties from the input. You can supply it with a property name, and only that will be passed through to the output:

```sh
$ echo '[{"name": "Joan", "age": 25}, {"name": "Bette", "age": 17}]' | jprops age
| [{"age":25},{"age":17}]
```

You can supply multiple property names and they will all be passed through:

```sh
$ echo '[{"name": "Joan", "age": 25, "occupation": "doctor"}, {"name": "Bette", "age": 17, "occupation": "student"}]' | jprops -p age occupation
| [
|     {
|         "age": 25,
|         "occupation": "doctor"
|     },
|     {
|         "age": 17,
|         "occupation": "student"
|     }
| ]
```

You can traverse an object hierarchy using by using dots in your property names:

```sh
$ echo '[ {\
    "name": "Yoel", \
    "address": { \
      "street": "157 Iosefka Pl.", \
      "country": "Laos" \
    } \
  }, { \
    "name": "Polly", \
    "address": { \
      "street": "43 Mangan Dr.", \
      "country": "Canada" \
    } \
  } ]' | jprops -p name address.country
| [
|     {
|         "name": "Yoel",
|         "address": {
|             "country": "Laos"
|         }
|     },
|     {
|         "name": "Polly",
|         "address": {
|             "country": "Canada"
|         }
|     }
| ]
```

You can rename properties in the output using the syntax `outputKey=inputKey`:

```sh
$ echo '[ {\
    "name": "Yoel", \
    "address": { \
      "street": "157 Iosefka Pl.", \
      "country": "Laos" \
    } \
  }, { \
    "name": "Polly", \
    "address": { \
      "street": "43 Mangan Dr.", \
      "country": "Canada" \
    } \
  } ]' | jprops -p name country=address.country
| [
|     {
|         "name": "Yoel",
|         "country": "Laos"
|     },
|     {
|         "name": "Polly",
|         "country": "Canada"
|     }
| ]
```

You may also use dot syntax on the lefthand side of a rename to construct objects on the fly:

```sh
$ echo '[ { \
    "city": "Middleburg", \
    "lat": 89, \
    "lng": -32 \
  }, { \
    "city": "Retten", \
    "lat": 35, \
    "lng": 90 \
  } ]' | jprops -p city gps.lat=lat gps.lng=lng
| [
|     {
|         "city": "Middleburg",
|         "gps": {
|             "lat": 89,
|             "lng": -32
|         }
|     },
|     {
|         "city": "Retten",
|         "gps": {
|             "lat": 35,
|             "lng": 90
|         }
|     }
| ]
```

If your input is not an array, it is processed as-is:

```sh
$ echo '{"x": 2, "y": 3, "z": 16}' | jprops x z
| {"x":2,"z":16}
```

Nonsensical mappings result in an error:

```sh
$ echo '{}' | jprops x=
@ Invalid property mapping: x=
? 1
```

References to nonexistent properties are ignored:

```sh
$ echo '[{"x": 1, "y": 3}, {"x": 2}]' | jprops x y
| [{"x":1,"y":3},{"x":2}]
```

Note that attempting to traverse arrays with `jprops` is not recommended. Use the longhand `jselect` to make your intentions clear.
