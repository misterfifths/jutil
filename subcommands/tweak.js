'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Run Javascript against JSON data and output the data, including modifications made by the script.',
    usageString: '<script>',
    minPositionalArguments: 1,
    maxPositionalArguments: 1,
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: tweakCommandHandler
};

function tweakCommandHandler(runtimeSettings, config, opts)
{
    let res = [],
        scriptWithReturn = opts._args[0] + '; return $';

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
