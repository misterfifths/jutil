'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the input, accumulating the result of the given expression for each object.',
    options: {
        shaper: {
            position: 1,
            required: true,
            help: 'Expression to evaluate for each object in the loaded data. (Required)'
        }
    },
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: selectCommandHandler
};

function selectCommandHandler(runtimeSettings, config, opts)
{
    // TODO: maybe an option to omit falsy results

    let res = [];
    
    processors.mapOverInput(opts.shaper, runtimeSettings, (raw, shaped) => {
        res.push(shaped);
        return true;
    });
    
    return res;
}
