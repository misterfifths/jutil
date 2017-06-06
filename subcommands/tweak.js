'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Run a script against the objects in the loaded data, outputting its results.',
    options: {
        script: {
            position: 1,
            help: 'Script to run against the objects in the loaded data.',
            required: true
        }
    },
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: tweakCommandHandler
};

function tweakCommandHandler(runtimeSettings, config, opts)
{
    let res = [],
        scriptWithReturn = opts.script + '; return $';

    processors.mapOverInput(scriptWithReturn, runtimeSettings, (raw, ret) => {
        res.push(ret);
        return true;
    }, false);

    // Using mapOverInput like we did means that we will always have an array result.
    // If the input data was a single object, let's unpack it from the res array:
    if(!Array.isArray(runtimeSettings.data))
        return res[0];

    return res;
}
