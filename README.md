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
The default behavior, as discussed above, runs a script you provide (which is optional) and prints its result. The script is evaluated in an enviroment where `this` refers to the loaded data (after any unwrapping). It is also, by default, wrapped inside `with(this) { ... }`, so that properties from the data can be referenced without qualification. This may be troublesome if the data has property names that hide helpful globals. The `--disable-with` or `-W` command-line options disable this feature.

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
