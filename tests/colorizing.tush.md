# Colorizing

When pretty-printing, jutil can optionally colorize JSON output for ease of reading. By default, output will be colorized if your terminal supports it. To tweak this behavior, see the `--color` flag and the `color` config file option. Here we will just be doing a basic test that things work. Since our testing framework doesn't output to a terminal, we have to force color output from jutil. Also, ANSI color escape codes don't look so hot in plain text, so .. uh .. probably just ignore this file.

```sh
$ echo '[1,-2,1e5,true,false,null,"a\"b",{}, [], {"x": 2}]' | jutil --color=force -p
| [
|     [36m1[39m,
|     [36m-2[39m,
|     [36m100000[39m,
|     [34mtrue[39m,
|     [34mfalse[39m,
|     [31mnull[39m,
|     [33m"a\"b"[39m,
|     {},
|     [],
|     {
|         [1m[35m"x"[39m[22m: [36m2[39m
|     }
| ]
```

The `auto+pager` option will colorize when paging (as will `force`). See the [Smart Output tests](smart-output.tush.md) for details on `--force-smart`.

```sh
$ echo '{"a": -12.2}' | PAGER="$(pwd)/pager-with-side-effects" jutil --force-smart --color=force
| --PAGING--
| {
|     [1m[35m"a"[39m[22m: [36m-12.2[39m
| }
```

For debugging purposes, the `FORCE_COLOR` environmental variable will make the `auto` and `auto+pager` flags convinced that the output supports color. So, we should get the same output as above with `auto+pager` if we turn on that variable:

```sh
$ echo '{"a": -12.2}' | PAGER="$(pwd)/pager-with-side-effects" FORCE_COLOR=1 jutil --force-smart --color=auto+pager
| --PAGING--
| {
|     [1m[35m"a"[39m[22m: [36m-12.2[39m
| }
```
