*jutil*: Poke at JSON from the command line
===========================

Do a lot of testing of JSON APIs from the command line? Insulted by doing mindless greps against structured data? Fingers sore from typing `| python -mjson.tool`?

Well, **jutil** is (possibly) for you!

Say what now?
------------
In its simplest form, jutil accepts JSON-formatted data, provides you an environment to run a script against it, and prints out the return value of that script. For instance:

````
$ curl -s http://graph.facebook.com/4 | jutil 'return name'
"Mark Zuckerberg"
````

Or, if your script returns an object, it is formatted as JSON:

```
$ curl -s https://api.twitter.com/1/statuses/public_timeline.json | jutil 'return this[0].user'
{
    "contributors_enabled": false,
    "created_at": "Thu Sep 22 18:56:51 +0000 2011",
    "default_profile": false,
    "default_profile_image": false,
    ...
```


But of course, there's much more. This is just the simplest of jutil's *commands*, called "script".