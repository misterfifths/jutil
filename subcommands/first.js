'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the JSON input, returning the first object that matches the given Javascript predicate. If predicate is omitted, the first object from the input is returned.',
    usageString: '[predicate]',
    maxPositionalArguments: 1,
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: firstCommandHandler
};

function firstCommandHandler(runtimeSettings, config, opts)
{
    let res,
        predicate;

    if(opts._args.length === 0) {
        // TODO: short-circuite this case
        predicate = 'true';
    }
    else {
        predicate = opts._args[0];
    }

    processors.runPredicate(predicate, runtimeSettings, match => {
        res = match;
        return false;
    });
    
    return res;
}
