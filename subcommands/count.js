"use strict";

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the input, counting the objects that match the given predicate.',
    options: {
        predicate: {
            position: 1,
            help: 'Predicate to evaluate for each object in the loaded data. If omitted, all objects will be counted.'
        }
    },
    outputsObject: false,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: countCommandHandler
};

function countCommandHandler(runtimeSettings, config, opts)
{
    let res = 0;
    
    if(!opts.predicate)
        opts.predicate = 'true';
    
    processors.runPredicate(runtimeSettings, opts, function(match) {
        res++;
        return true;
    });
    
    return res.toString() + '\n';
}
