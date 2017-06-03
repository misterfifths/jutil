"use strict";

const processors = require('../processors.js');

module.exports = {
    help: 'Sort the objects in the input by a given key expression.',
    options: {
        sortKeyExpr: {
            position: 1,
            help: 'The expression that provides the sort key for each object in the loaded data. If omitted, defaults to the object itself.'
        },
        ignoreCase: {
            abbr: 'i',
            full: 'ignore-case',
            flag: true,
            help: 'Ignore case when comparing string sort keys.'
        },
        descending: {
            abbr: 'r',
            full: 'reverse',
            flag: true,
            help: 'Reverse the result of comparisons; output objects in descending order.'
        }
    },
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: sortCommandHandler
};

function sortCommandHandler(runtimeSettings, config, opts)
{
    var vm = require('vm'),
        data = runtimeSettings.data,
        keyedData = [],
        i,
        expr = opts.sortKeyExpr || '$';  // default sort key is the whole object
    
    if(!Array.isArray(data))
        return data;
    
    // Generate keys and stash them in keyedData
    processors.mapOverInput(expr, runtimeSettings, function(obj, key) {
        keyedData.push({ key: key, obj: obj });
        return true;
    });

    // Sort keyedData on keys
    keyedData.sort(function(x, y) {
        if(opts.ignoreCase) {
            if(typeof x.key == 'string') x.key = x.key.toLowerCase();
            if(typeof y.key == 'string') y.key = y.key.toLowerCase();
        }

        if(x.key == y.key) return 0;
        if(x.key < y.key) return opts.descending ? 1 : -1;
        return opts.descending ? -1 : 1;
    });

    // Unwrap the objects in keyedData
    for(i = 0; i < keyedData.length; i++)
        data[i] = keyedData[i].obj;
    
    return data;
}