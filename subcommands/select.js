'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the input JSON, accumulating the result of the given Javascript expression for each object.',
    usageString: '<expression>',
    minPositionalArguments: 1,
    maxPositionalArguments: 1,
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: selectCommandHandler
};

function selectCommandHandler(runtimeSettings, config, opts)
{
    // TODO: maybe an option to omit falsy results

    let res = [];
    
    processors.mapOverInput(opts._args[0], runtimeSettings, (raw, shaped) => {
        res.push(shaped);
        return true;
    });
    
    return res;
}
