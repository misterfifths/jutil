'use strict';

const utils = require('../utils.js');

module.exports = {
    help: 'Joins JSON files together. Arrays will be concatenated, and objects will be added to an array.',
    usageString: '<file...>',
    minPositionalArguments: 1,
    hasFileOption: false,
    outputsObject: true,
    needsSandbox: false,
    hasWithClauseOpt: false,
    handler: catCommandHandler
};

function catCommandHandler(runtimeSettings, config, opts)
{
    if(opts._args.length == 1) {
        // Special case: single files are passed through unchanged, regardless of their content
        return utils.loadJSON(opts._args[0], runtimeSettings, config);
    }

    let res = [];

    for(let inputFile of opts._args) {
        const data = utils.loadJSON(inputFile, runtimeSettings, config);

        if(Array.isArray(data))
            res.push.apply(res, data);
        else
            res.push(data);
    }

    return res;
}