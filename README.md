*jutil*: Poke at JSON from the command line
===========================

Do a lot of testing of JSON APIs from the command line? Insulted by doing mindless greps against structured data? Fingers sore from typing `| python -mjson.tool`?

Well, **jutil** is (probably) for you! It runs on [node.js](http://nodejs.org) and you can install it via [npm](http://npmjs.org/) with `npm -g install jutil`.

Say what now?
------------
In its simplest form, jutil accepts JSON-formatted data, provides you an environment to run some JavaScript against it, and prints out the return value of that script. For instance:

````sh
$ curl -s http://graph.facebook.com/4 | jutil 'return name'
"Mark Zuckerberg"
````

Or, if your script returns an object, it is formatted as JSON:

```sh
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json | jutil 'return this[0].user'
{
    "contributors_enabled": false,
    "created_at": "Thu Sep 22 18:56:51 +0000 2011",
    "default_profile": false,
    "default_profile_image": false,
    ...
}
```

But of course, there's much more. This is just the simplest of jutil's commands.


Commands
========

Each of these commands can be run in two ways: `jutil <command>` or via an alias, `j<command>`. Aliases are installed for each command by the npm package, and we will refer to them via those aliases below. You can see detailed help on the options for each command by running them with the `--help` or `-h` command-line argument.

jutil
-----
The default behavior, as discussed above, runs a script you provide (which is optional) and prints its result. The script is evaluated in an enviroment where `this` refers to the loaded data (after any unwrapping -- see the "Unwrapping" section below). It is also, by default, wrapped inside `with(this) { ... }`, so that properties from the data can be referenced without qualification. This may be troublesome if the data has property names that hide helpful globals. The `--disable-with` or `-W` command-line options disable this feature.

You may have noticed the returned JSON in the second sample above is formatted. By default, if jutil's stdout is a terminal, the output will be pretty-printed and sent to your pager if it is larger than your screen. To disable this feature, use the `--disable-smart` or `-S` options.

jwhere
------
This tool iterates over the elements in the input and returns any objects that match the predicate you provide. If the input is not an array, it is converted to a one-element array. If no objects in the input match, the empty array `[]` is returned.

The predicate runs in a similar context to that of scripts for `jutil`, except that it must be an expression and not a full program. The result of the predicate expression will be converted to a boolean, so JavaScript's notorious rules about "falsiness" are in play. Let's look at some examples:

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

Find people using Twitter to its fullest:

````sh
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json | jwhere 'text.length == 140'
[
    {
        "contributors": null,
        "coordinates": null,
        ...
        "text": "How bout baby we make a promise to not promise anything more than 1 night, complicated situations only get worse in the morning light #LadyA"
        ...
    },
    {
        ...
    },
    ...
]
````

jfirst
------

Accepts a predicate in the same form as `jwhere`, but only returns the first matching object in the data. If no predicate is provided, the first object in the data is returned.

jcount
------
Accepts a predicate in the same form as `jwhere` and outputs the number of matching objects in the data. If no predicate is provided, the number of all objects in the data is returned.

jselect
-------
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

jsort
-----
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

By default, objects are sorted by your key expression in ascending order. Pass `-r` for descending. If your sort key is a string, it is compared in a case-sensitive manner by default--`-i` makes it case-insensitive.

There is nothing stopping you from returning a more complicated object as your sort key; in fact, if you omit a sort key expression, the objects in the input will be used wholesale as the sort keys. However, since sort keys are compared using native operators, the result with sort keys that are objects will be meaningless.

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

jprops
------
This tool is intended to streamline the most common use for `jselect`, selecting only a subset of properties from objects in the data. `jprops` takes a list of property mappings, of the form `[to=]from`, where `to` is the property in the result and `from` is the property in the input. If `to` is ommitted, it defaults to `from`. Note that either of these mapping components can have dots in them, to specify an object traversal.

So, for example, to collect only the usernames and tweets from the timeline:

````sh
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json | jprops text user=user.screen_name
[
    {
        "text": "The eduMOOC News is out! http://t.co/MamJoAuZ ▸ Top stories today via @jupidu @jankenb2",
        "user": "myweb2learn"
    },
    {
        "text": "#ipadtweet",
        "user": "The_DanSullivan"
    },
    ...
]
````

Things get a little funky if you try to traverse into an array with one of your mappings. It 'works' right now, for some definition of work, but I'd recommend staying away for the time being.

jformat
-------
This one is kind of like `jselect`, but instead of returning an object for each element in the data, it assembles a string. Tokens in the format string are of one of two forms: `%propertyName` or `%{expression}`. Note that the first syntax works only for simple property names -- it does not understand dot syntax.

Here, have an example:

````sh
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json |
  jformat "%{user.name}: %{user.statuses_count} tweets, follower/friend ratio: %{(user.followers_count / user.friends_count).toFixed(2)}"
PrettyMotherfucka♥: 45716 tweets, follower/friend ratio: 1.33
L O A D I N G....OH!: 15045 tweets, follower/friend ratio: 1.18
...
````

Putting it all together
-----------------------
Since most of these tools output JSON, you can chain them together like crazy. And `jformat` opens the door to programs that don't understand JSON. [One thing well](http://en.wikipedia.org/wiki/Unix_philosophy), baby!

So, who's the most active recent tweeter?

````sh
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json |
  jsort -r user.statuses_count |
  jfirst |
  jformat 'Of the most recent tweeters, user %{user.name} has the most updates: %{user.statuses_count}'
Of the most recent tweeters, user jorge has the most updates: 36870
````

And what's the language breakdown in the most recent [Gists](https://gist.github.com/)?

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

The pipe is your friend.


Advanced Usage
==============

Config files
------------
You can set up a variety of default options and tweak the behavior of jutil with a configuration file, which lives at `~/.jutil/config` by default. To specify another configuration file to load, use the `-c` option to any tool.

The config file is a JavaScript file (not strictly JSON; it is essentially `eval`'d) that must at some point assign to a global object called `config`. For example, a config file that turns on key sorting in JSON output by default would look like this:

````javascript
var config = { alwaysSortKeys: true };
````

You can find a complete list of the options available in a configuration file (and their default values) at the top of [the main source file](https://github.com/misterfifths/jutil/blob/master/jutil.js#L5).

Unwrapping
----------
Many JSON APIs wrap their real payload in an object with metadata -- pagination information or rate limits, for example. And metadata aside, most such APIs wrap arrays in dummy objects to sidestep [this nasty issue](http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx). But more often than not, all you care about as far as manipulation is concerned is the actual payload.

The naive way to handle this is to pass the raw input through `jutil` first, returning only the payload. For example:

````sh
$ echo '{ "payload": [ { "x": 2, "y": 3 }, { "x": 4, "y": 6 } ] }' |
  jutil 'return this.payload' |
  jformat 'sum: %{x + y}'
sum: 5
sum: 10
````

This works fine, but is a lot of typing. The jutil suite offers two ways to automatically unwrap a payload. The first is to manually specify the property name that contains the payload, using the `-u` or `--unwrap-prop` argument to any tool. We can then turn our last example into the following:

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

In a config file, you can turn unwrapping on by default, override the behavior of the auto-unwrapper, and specify a default list of unwrapping properties. With a small amount of customization, you should never have to worry about wrapped payloads.

Modules
-------
