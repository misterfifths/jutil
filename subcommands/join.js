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
            help: 'JSON files to join together. The root object of each must be an array. (At least one is required)'
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
        let input,
            data;

        try {
            input = fs.readFileSync(inputFile, { 'encoding': 'utf8' });
        }
        catch(exc) {
            console.error('Error: Unable to load input file "' + runtimeSettings.file + '": ' + exc);
            process.exit(1);
        }

        try {
            data = runtimeSettings.inputParser(config, input);
        }
        catch(exc) {
            console.error('Error parsing input: ' + exc + '.\nInput:\n' + input);
            process.exit(1);
        }

        if(runtimeSettings.unwrapper)
            data = runtimeSettings.unwrapper(config, data);

        if(!Array.isArray(data)) {
            console.error('Error: All input files must be arrays or unwrap to arrays.');
            process.exit(1);
        }

        res.push.apply(res, data);
    }

    return res;
}