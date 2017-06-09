# *jutil*: Poke at JSON from the command line

[![Build Status](https://travis-ci.org/misterfifths/jutil.svg?branch=master)](https://travis-ci.org/misterfifths/jutil) [![Coverage Status](https://coveralls.io/repos/github/misterfifths/jutil/badge.svg?branch=master)](https://coveralls.io/github/misterfifths/jutil?branch=master) [![npm](https://img.shields.io/npm/v/jutil.svg)](https://www.npmjs.com/package/jutil)

Do a lot of testing of JSON APIs from the command line? Insulted by doing mindless greps against structured data? Fingers sore from typing `| python -mjson.tool`?

Well, **jutil** is (probably) for you! It runs on [node.js](http://nodejs.org) and you can install it via [npm](http://npmjs.org/) with `npm -g install jutil`.

# Say what now?
In its simplest form, jutil accepts JSON-formatted data, provides you an environment to run some JavaScript against it, and prints out the return value of that script. For instance:

````sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/1/ | jutil 'return name'
"bulbasaur"
````

Or, if your script returns an object, it is formatted as JSON:

```sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/1/ jutil 'return types[0].type'
{
    "url": "http://www.pokeapi.co/api/v2/type/4/",
    "name": "poison"
}
```

But the real power of jutil comes from chaining together multiple commands. For instance, let's print out the names of all of Bulbasaur's base stats that are greater than 60:

```sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/1/ | jwhere -u stats 'base_stat > 60' | jformat '%{stat.name}'
special-defense
special-attack
```

Or a more accurate list of a Pokemon's type:

```sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/1/ | jutil 'return types' | jsort slot | jselect type.name
[
    "grass",
    "poison"
]
```

But of course, there's much more.

# Commands

Each of these commands can be run in two ways: `jutil <command>` or via an alias, `j<command>`. Aliases are installed for each command by the npm package, and we will refer to them via those aliases below. You can see detailed help on the options for each command by running them with the `--help` or `-h` command-line argument.

## jutil

The default behavior, as shown above, runs a script you provide and prints its result. The script is evaluated in an enviroment where `$` refers to the loaded data (after any [unwrapping](#unwrapping)). It is also, by default, wrapped inside `with($) { ... }`, so that properties from the data can be referenced without qualification. This may be troublesome if the data has property names that hide [helpful globals](#more-on-the-context-in-which-your-scripts-execute). The `--disable-with` or `-W` command-line options disable this feature. For more details on the context in which your script executes, see [this section](#more-on-the-context-in-which-your-scripts-execute).

You may have noticed the returned JSON in the second sample above is formatted. By default, if jutil's stdout is a terminal, the output will be pretty-printed and sent to your pager if it is larger than your screen. To disable this feature, use the `--disable-smart` or `-S` options.

You can see more basic examples of the default behavior in [the tests](https://github.com/misterfifths/jutil/blob/master/tests/core.tush.md#scripts).

## jwhere

This tool iterates over the elements in the input and returns any objects that match the predicate you provide. If the input is not an array, it is converted to a one-element array. If no objects in the input match, the empty array `[]` is returned.

The predicate runs in a similar context to that of scripts for `jutil`, except that it must be an expression and not a full program. Each time your expression is evaluated, the `$` variable refers to the current element in the data (and you are, as above, optionally within `with($) { ... }`). The result of the predicate expression will be converted to a boolean, so JavaScript's notorious rules about "falsiness" are in play. Let's look at some examples:

````sh
$ echo '[ {"x": 1, "y": 2}, {"x": 2, "y": 3}, {"x": 3, "y": 6} ]' | jwhere 'x + y > 4'
[
    {
        "x": 2,
        "y": 3
    },
    {
        "x": 3,
        "y": 6
    }
]
````

Find the visible moves of Voltorb:

````sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/100/ | jutil 'return abilities' | jwhere '!is_hidden'
[
    {
        "is_hidden": false,
        ...
        "name": "static"
    },
    {
        "is_hidden": false,
        ...
        "name": "soundproof"
    },
]
````

Or just remove falsy values from an input:

````sh
$ echo '[0, false, 4, "", "Bob"]' | jwhere $
[
    4,
    "Bob"
]
````

## jfirst, jtake, jdrop

`jfirst` accepts a predicate in the same form as `jwhere`, but only returns the first matching object in the data. If no predicate is provided, the first object in the data is returned.

`jtake` and `jdrop` select or remove a given number of records from the data, respectively.

## jcount

Accepts a predicate in the same form as `jwhere` and outputs the number of matching objects in the data. If no predicate is provided, the number of all objects in the data is returned.

## jselect

For every object in the input data, this tool evaluates a given expression and accumulates the results of those expressions in an array. That is, it essentially does `Array.map` over your objects with an expression you provide. This is useful for shaping the incoming data into a different form (though `jprops` is probably more convenient if all you're doing is extracting certain properties).

A contrived example:

````sh
$ echo '[ {"x": 1, "y": 2}, {"x": 2, "y": 3} ]' | jselect '{x: x, y: y, sum: x + y}'
[
    {
        "x": 1,
        "y": 2,
        "sum": 3
    },
    {
        "x": 2,
        "y": 3,
        "sum": 5
    }
]
````

## jsort

As the name implies, this one sorts the objects in the input data via a given sort key. If the input is not an array, it is returned unaltered. Here's a trivial example:

````sh
$ echo '[ {"x": 10, "y": 2}, {"x": 2, "y": 3} ]' | jsort 'x + y'
[
    {
        "x": 2,
        "y": 3
    },
    {
        "x": 10,
        "y": 2
    }
]
````

By default, objects are sorted by your key expression in ascending order. Pass `-r` for descending. If your sort key is a string, it is compared in a case-sensitive manner by default — `-i` makes it case-insensitive.

There is nothing stopping you from returning a more complicated object as your sort key; in fact, if you omit a sort key expression, the objects in the input will be used wholesale as the sort keys. However, since sort keys are compared using native operators, the result with sort keys that are objects will likely be meaningless.

The behavior with no sort key expression can be useful, however, if your data is an array of straight strings or numbers:

````sh
$ echo '[5, 2, 6, 10]' | jsort -r
[
    10,
    6,
    5,
    2
]
````

## jprops

This tool is intended to streamline the most common use for `jselect`, selecting only a subset of properties from objects in the data. `jprops` takes a list of property mappings, of the form `[to=]from`, where `to` is the property in the result and `from` is the property in the input. If `to` is ommitted, it defaults to `from`. Note that either of these mapping components can have dots in them, to specify an object traversal.

So, for example, to collect only the usernames and tweets from the timeline:

````sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/1 | jutil 'return stats' | jprops name=stat.name base_stat
[
    {
        "name": "speed",
        "base_stat": 45
    },
    {
        "name": "special-defense",
        "base_stat": 65
    },
    ...
]
````

Check out the examples for the [object-path](https://github.com/mariocasciaro/object-path) library to see what other types of property paths are supported.

## jformat

This one is kind of like `jselect`, but instead of returning an object for each element in the data, it assembles a string. Tokens in the format string are of one of two forms: `%propertyName` or `%{expression}`. Note that the first syntax works only for simple property names — it does not understand dot syntax.

Here, have an example:

```sh
$ curl -s http://www.pokeapi.co/api/v2/pokemon/1 |
    jutil 'return stats' |
    jsort stat.name |
    jformat '%{stat.name.split("-").join(" ").padEnd(20)} %base_stat'
attack               49
defense              49
hp                   45
special attack       65
special defense      65
speed                45
```

## jcat

This tool concatenates the objects in multiple JSON files. If given arrays, they are all concatenated. If given objects, they are placed in an array. For example, assume we have a few files: `array_1-3.json` and `array_3-5.json` that contain array of their titular numbers. Then:

```sh
$ jcat array_1-3.json array_3-5.json
[
    1,
    2,
    3,
    4,
    5
]
```

Or, if the files contain objects, they are all placed in an array:

```sh
$ echo '{ "a": 1 }' > first.json
$ echo '{ "a": 2 }' > second.json
$ echo '{ "a": 3, "b": 1 }' > third.json
$ jcat first.json second.json third.json
[
    {
        "a": 1
    },
    {
        "a": 2
    },
    {
        "a": 3,
        "b": 1
    }
]
```

## jtweak

This tool lets you modify your data by writing a short script that tweaks the values of records. See the [tests](tests/jtweak.tush.md) for examples.

## Putting it all together

Since most of these tools output JSON, you can chain them together like crazy. And `jformat` opens the door to programs that don't understand JSON. [One thing well](http://en.wikipedia.org/wiki/Unix_philosophy), baby!

So, who's the most active recent tweeter?

````sh
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json |
  jsort -r user.statuses_count |
  jfirst |
  jformat 'Of the most recent tweeters, user %{user.name} has the most updates: %{user.statuses_count}'
Of the most recent tweeters, user jorge has the most updates: 36870
````

What's the language breakdown in the most recent [Gists](https://gist.github.com/)?

````sh
$ curl -s https://api.github.com/gists |
  jselect 'files[Object.keys(files)[0]]' |
  jwhere language |
  jformat %language |
  sort | uniq -c | sort -nr
  10 Text
   3 XML
   3 Ruby
   3 JavaScript
   2 HTML+ERB
   2 Groovy
   2 C#
   1 Shell
   1 PHP
````

Say the [names of all the Pokemon](https://soundcloud.com/tim-clem-404086192/all-pokemon):

````sh
$ curl -s ttp://www.pokeapi.co/api/v2/pokedex/1/ |
  jformat -u pokemon_entries -n '%{pokemon_species.name}, ' |
  say -v Alex -f -
````

The pipe is your friend.

## More examples

Check out the [literate test scripts](tests) for more examples and details on usage.


# Advanced Usage

## Config files

You can set up a variety of default options and tweak the behavior of jutil with a configuration file, which lives at `~/.jutil/config` by default. To specify another configuration file to load, use the `-c` option to any tool or set the `JUTIL_CONFIG_PATH` environmental variable.

The config file is a JavaScript file (not strictly JSON; it is essentially `eval`'d) that must at some point assign to a global object called `config`. For example, a config file that turns on key sorting in JSON output by default would look like this:

````javascript
var config = { alwaysSortKeys: true };
````

You can find a complete list of the options available in a configuration file (and their default values) at the top of [the main source file](https://github.com/misterfifths/jutil/blob/master/jutil.js#L5).

## Unwrapping

Many JSON APIs wrap their real payload in an object with metadata — pagination information or rate limits, for example. And metadata aside, most such APIs wrap arrays in dummy objects to sidestep [this nasty issue](http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx). But more often than not, all you care about as far as manipulation is concerned is the actual payload.

The naive way to handle this is to pass the raw input through `jutil` first, returning only the payload. For example:

````sh
$ echo '{ "payload": [ { "x": 2, "y": 3 }, { "x": 4, "y": 6 } ] }' |
  jutil 'return payload' |
  jformat 'sum: %{x + y}'
sum: 5
sum: 10
````

This works fine, but is a lot of typing. The jutil suite offers two ways to unwrap a payload inline. The first is to manually specify the property name that contains the payload, using the `-u` or `--unwrap-prop` argument to any tool. We can then turn our last example into the following:

````sh
$ echo '{ "payload": [ { "x": 2, "y": 3 }, { "x": 4, "y": 6 } ] }' | jformat -u payload 'sum: %{x + y}'
sum: 5
sum: 10
````

Ah, that feels better. There is also *auto-unwrapping* (`-a` or `--auto-unwrap`), which attempts to be smart about what might be a payload. The default algorithm (which you can override in a config file) is rather naive. If the input is an object that only has one property, and the value of that property is an object or an array, it returns that value. That is exactly the case we have in our example above, so we could in fact further simplify it:

````sh
$ echo '{ "payload": [ { "x": 2, "y": 3 }, { "x": 4, "y": 6 } ] }' | jformat -a 'sum: %{x + y}'
sum: 5
sum: 10
````

In a [config file](#config-files), you can turn unwrapping on by default, override the behavior of the auto-unwrapper, and specify a default list of unwrapping properties. With a small amount of customization, you should never have to worry about wrapped payloads.

## Modules

To make scriptwriting easier, you may wish to define a set of frequently-used functions or include utility libraries in the environment where jutil evaluates its input. You can do this with *modules*. You can include modules in two ways: by pointing jutil at a directory (in which case all .js files in that directory will be loaded — the `-M` or `--module-dir` option), or at individual files with `-m` or `--module`. By default, the directory `~/.jutil/modules` will be searched if it exists. You can specify default directories in a [config file](#config-files).

As a plausible example, say you wanted the great [underscore.js](http://documentcloud.github.com/underscore/) available to you in all jutil calls. Simple download it and place it in the `~/.jutil/modules` directory, and the `_` object will exist:

````sh
$ echo "[3, 4, 1]" | jutil 'return _.shuffle($)'
[
    4,
    3,
    1
]
````

You could use the module facility to provide a custom suite of helper functions. For example, say you frequently need to compute MD5 sums. This simple module file provides a function to jutil, `$md5`, that does so:

````javascript
function $md5(str) {
    var hasher = require('crypto').createHash('md5');
    hasher.update(str, 'utf8');
    return hasher.digest('base64');
}
````

Note the use of `require()`; module code runs inside a node environment — the sky's the limit.

With that file in a module directory, we can do this:

````sh
echo '[ { "name": "Sam" }, { "name": "Lou" } ]' | jselect '{ name: name, hash: $md5(name) }'
[
    {
        "hash": "ug4M3hv3LCjUNciaZq/GGg==",
        "name": "Sam"
    },
    {
        "hash": "qAli+cWlWug7DnMZsv2Wrw==",
        "name": "Lou"
    }
]
````

## More on the context in which your scripts execute

Commands that accept scripts on the command line run those scripts inside a [V8 sandbox](https://nodejs.org/docs/latest/api/vm.html). This is the same sandbox where [modules](#modules) are loaded, hence the ability for modules to make functionality available to your scripts.

The sandbox is populated with the following globals (in addition to the standard JavaScript ones):

* `$config`: the contents of the user's [config file](#config-files), or the default configuration if no config file was loaded
* `$$`: all of the loaded data, after any [unwrapping](#unwrapping)
* `console`: the node [console object](https://nodejs.org/docs/latest/api/console.html)
* `out`: an alias for [`console.log`](https://nodejs.org/docs/latest/api/console.html#console_console_log_data_args)
* `process`: the node [process object](https://nodejs.org/docs/latest/api/globals.html#globals_process)
* `require`: the node [require function](https://nodejs.org/docs/latest/api/globals.html#globals_require) to load external modules

Additionally, as discussed in the [jutil](#jutil) section, your script is evaluated inside a function wrapper where `$` refers to the current data, and is generally (barring `--disable-with`) inside `with($) { ... }`. For commands that loop over the input (like [jwhere](#jwhere)), the same is true except `$` refers to one object in the input at a time. You can access the entirety of the data at any time using the global `$$`, mentioned above.
