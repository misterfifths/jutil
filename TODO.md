# TODO

## General

- Change examples in README to a working API. Perhaps [magicthegathering.io](http://magicthegathering.io)?
- Switch to another arguments parser, probably [commander](https://github.com/tj/commander.js)
- More coverage. Mainly this involves testing ins and outs of config files, and maybe figuring something out for smart output.
- Document and test scripts returning non-objects (numbers, strings)
- Actually do something with verbosity (`-v`)
- More ES6ification: look for use cases for template strings, etc.

## Specific

- Fix weirdo `jprops` keypath syntax and its interaction with arrays.
- Perhaps standardize on keypaths everywhere that takes a property name, particularly with unwrapping. E.g. for Foursquare categories it would be `-u response.categories`.

## New commands

- `jtake`: Generalized `jfirst`
- `jfold`: Like [Haskell's `foldr` and friends](https://wiki.haskell.org/Fold) - initial, iterative expression, reducer
- `jtweak` (need better name): Script lets you modify `$`, and collects your changes at the end. No return value from script. Inline modifications:

    ```sh
    $ echo '[{"a": 1, "b":2}]' | jtweak '$.sum = a + b; delete $.b'
    {
        "a": 1,
        "sum": 3
    }
    ```
