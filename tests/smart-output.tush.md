# Smart Output

Nothing much to see here; just exercising smart output (auto-paging and automatic pretty-printing).

We're going to be testing features that are usually only enabled when outputting to a terminal. Since our test framework captures output, we have to jump through some hoops to make that work. There's a hidden testing flag, `--force-smart`, that enables smart output even if we're not writing to a TTY, and fakes the window size to be 80x1.

**There is no reason to ever use `--force-smart` outside of these tests.** Smart output is on by default if you are using a TTY.

Also of note: the `run_tests` script sets `PAGER` to `cat`, for ease of testing.

Smart output does a few things. If it detects we're using a TTY, it turns on pretty-printing:

```sh
$ echo '[1]' | jutil --force-smart
| [
|     1
| ]
```

If it detects that the output is too big to fit on one screen, it automatically pipes the output to your pager. It uses the `PAGER` environmental variable, or `less` by default. We have a custom pager, `pager-with-side-effects`, that prints a header before the output:

```sh
$ echo '[1]' | PAGER="$(pwd)/pager-with-side-effects" jutil --force-smart
| --PAGING--
| [
|     1
| ]

$ echo '[]' | PAGER="$(pwd)/pager-with-side-effects" jutil --force-smart
| []
```

If `PAGER` points to a non-existent or non-executable file, the error is printed and output is not paged. Note that in the tests below we have to be tricky, since the exact error message varies between shells. The output will be a pretty-printed array (3 lines) and another for the error:

```sh
$ echo '[1]' | PAGER=nonsense jutil --force-smart 2>&1 | wc -l
|        4

$ echo '[1]' | PAGER="$(pwd)" jutil --force-smart 2>&1 | wc -l
|        4
```

If `PAGER` exits with a non-zero status code, no special output is produced, but the status code is passed through:

```sh
$ echo '[1]' | PAGER='exit 27' jutil --force-smart
? 27
```

Complex `PAGER` values are supported (it is interpreted by a shell):

```sh
$ echo '[1]' | PAGER='IN_A_SHELL="YES" cat' jutil --force-smart
| [
|     1
| ]
```
