'use strict';

const fs = require('fs'),
      utils = require('../utils.js');

module.exports = {
    help: 'Joins input files together. Arrays will be joined together, and objects will be added to an array.',
    usageString: '<file...>',
    minPositionalArguments: 1,
    hasFileOption: false,
    outputsObject: true,
    needsSandbox: false,
    hasWithClauseOpt: false,
    handler: joinCommandHandler
};

function joinCommandHandler(runtimeSettings, config, opts)
{
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