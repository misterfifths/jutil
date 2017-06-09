'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Sort the objects in the JSON input by a given key expression. If key is omitted, defaults to the object itself.',
    usageString: '[key-expression]',
    maxPositionalArguments: 1,
    options: [
        {
            names: ['ignore-case', 'i'],
            type: 'bool',
            help: 'Ignore case when comparing string sort keys.'
        },
        {
            names: ['reverse', 'r'],
            type: 'bool',
            help: 'Reverse the result of comparisons; output objects in descending order.'
        }
    ],
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: sortCommandHandler
};

function sortCommandHandler(runtimeSettings, config, opts)
{
    let data = runtimeSettings.data,
        keyedData = [],
        expr = opts._args.length == 1 ? opts._args[0] : '$';  // default sort key is the whole object
    
    if(!Array.isArray(data))
        return [data];  // Consistency with the behavior of where/first/select/etc. when given a non-array
    
    // Generate keys and stash them in keyedData
    processors.mapOverInput(expr, runtimeSettings, (obj, key) => {
        if(opts.ignore_case && typeof key == 'string') key = key.toLowerCase();
        keyedData.push({ key: key, obj: obj });
        return true;
    });

    // Sort keyedData on keys
    keyedData.sort((x, y) => {
        if(x.key == y.key) return 0;
        if(x.key < y.key) return opts.reverse ? 1 : -1;
        return opts.reverse ? -1 : 1;
    });

    // Unwrap the objects in keyedData
    for(let i = 0; i < keyedData.length; i++)
        data[i] = keyedData[i].obj;
    
    return data;
}
