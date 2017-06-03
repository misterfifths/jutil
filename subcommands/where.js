"use strict";

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the input, returning only objects that match the given predicate.',
    options: {
        predicate: {
            position: 1,
            required: true,
            help: 'Predicate to evaluate for each object in the loaded data. (Required)'
        }
    },
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: whereCommandHandler
};

function whereCommandHandler(runtimeSettings, config, opts)
{
    var res = [];
    
    processors.runPredicate(runtimeSettings, opts, function(match) {
        res.push(match);
        return true;
    });
    
    return res;
}