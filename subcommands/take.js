'use strict';

module.exports = {
    help: 'Return a given number of objects from the JSON input. If the input has fewer objects than the given number, all of the input is returned.',
    usageString: '<count>',
    minPositionalArguments: 1,
    maxPositionalArguments: 1,
    options: [
        {
            names: ['from-end', 'e'],
            type: 'bool',
            help: 'Remove objects from the end of the input rather than the beginning.'
        }
    ],
    outputsObject: true,
    needsSandbox: false,
    hasWithClauseOpt: false,
    handler: takeCommandHandler
};

function takeCommandHandler(runtimeSettings, config, opts)
{
    let count = parseInt(opts._args[0]);
    if(isNaN(count)) {
        console.error('Invalid count parameter: "' + opts._args[0] + '". Expected an integer.');
        process.exit(1);
    }

    let data = runtimeSettings.data;
    if(!Array.isArray(data))
        data = [data];

    if(opts.from_end)
        count = -count;
 
    if(count < 0)
        return data.slice(count);

    return data.slice(0, count);
}
