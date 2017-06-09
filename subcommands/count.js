'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the JSON input, counting the objects that match the given Javascript predicate. If predicate is omitted, all objects are counted.',
    usageString: '[predicate]',
    maxPositionalArguments: 1,
    outputsObject: false,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: countCommandHandler
};

function countCommandHandler(runtimeSettings, config, opts)
{
    let res = 0;
    
    if(opts._args.length === 0) {
        // Short-circuit the no-predicate case
        if(Array.isArray(runtimeSettings.data)) res = runtimeSettings.data.length;
        else res = 1;  // kind of nonsense, but keeping for backwards compatibility
    }
    else {
        processors.runPredicate(opts._args[0], runtimeSettings, match => {
            res++;
            return true;
        });
    }
    
    return res.toString() + '\n';
}
