'use strict';

module.exports = {
    help: 'Return a given number of objects from the input.',
    options: {
        count: {
            position: 1,
            help: 'How many objects to return from the input. If the input has fewer than this number of objects, all of the input is returned.',
            required: true
        },
        fromEnd: {
            abbr: 'e',
            full: 'from-end',
            flag: true,
            help: 'Take objects from the end of the input rather than the beginning.'
        }
    },
    outputsObject: true,
    needsSandbox: false,
    hasWithClauseOpt: false,
    handler: takeCommandHandler
};

function takeCommandHandler(runtimeSettings, config, opts)
{
    let count = parseInt(opts.count);
    if(isNaN(count)) {
        console.error('Invalid count parameter: "' + opts.count + '". Expected an integer.');
        process.exit(1);
    }

    let data = runtimeSettings.data;
    if(!Array.isArray(data))
        data = [data];

    if(opts.fromEnd)
        count = -count;
 
    if(count < 0)
        return data.slice(count);

    return data.slice(0, count);
}
