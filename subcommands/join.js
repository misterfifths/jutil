'use strict';

const fs = require('fs'),
      utils = require('../utils.js');

module.exports = {
    help: 'Joins input files together.',
    options: {
        files: {
            position: 1,
            list: true,
            required: true,
            help: 'JSON files to join together. Arrays will be joined together, and objects will be added to an array. (At least one is required)'
        }
    },
    hasFileOption: false,
    outputsObject: true,
    needsSandbox: false,
    hasWithClauseOpt: false,
    handler: joinCommandHandler
};

function joinCommandHandler(runtimeSettings, config, opts)
{
    let res = [];

    for(let inputFile of opts.files) {
        const data = utils.loadJSON(inputFile, runtimeSettings, config);

        if(Array.isArray(data))
            res.push.apply(res, data);
        else
            res.push(data);
    }

    return res;
}