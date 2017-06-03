"use strict";

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the input, returning the first object that matches the given predicate.',
    options: {
        predicate: {
            position: 1,
            help: 'Predicate to evaluate for each object in the loaded data. If omitted, the first object from the input will be returned.'
        }
    },
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: firstCommandHandler
};

function firstCommandHandler(runtimeSettings, config, opts)
{
    let res;

    if(!opts.predicate)
        opts.predicate = 'true';
    
    processors.runPredicate(runtimeSettings, opts, match => {
        res = match;
        return false;
    });
    
    return res;
}
