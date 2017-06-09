'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the JSON input, returning only objects that match the given Javascript predicate.',
    usage: '<predicate>',
    minPositionalArguments: 1,
    maxPositionalArguments: 1,
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: whereCommandHandler
};

function whereCommandHandler(runtimeSettings, config, opts)
{
    let res = [];
    
    processors.runPredicate(opts._args[0], runtimeSettings, match => {
        res.push(match);
        return true;
    });
    
    return res;
}
