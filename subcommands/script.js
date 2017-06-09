'use strict';

const utils = require('../utils.js'),
      processors = require('../processors.js');

module.exports = {
    help: 'Run Javascript against the incoming JSON data, outputting its return value.',
    usageString: '[script]',
    maxPositionalArguments: 1,
    options: [
        {
            names: ['script', 'i'],
            helpArg: 'FILE',
            help: 'Load the script to run from the given file instead of the first positional argument.',
            type: 'string'
        }
    ],
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: scriptCommandHandler
};

function scriptCommandHandler(runtimeSettings, config, opts)
{
    let rawScript;

    if(opts._args.length == 1 && opts.script) {
        console.error('Error: You cannot specify both a script file (-i/--script) and an inline script.');
        process.exit(1);
    }

    if(opts._args.length == 1) rawScript = opts._args[0];
    else if(opts.script) {
        let resolvedScriptPath = utils.resolvePath(opts.script);
        rawScript = utils.loadFile(resolvedScriptPath);
    }
    
    if(rawScript) {
        try {
            let evaluator = processors.sandboxEvaluatorFactory(rawScript, runtimeSettings, false, { 'filename': opts.script });
            return evaluator(runtimeSettings.sandbox.$$);
        }
        catch(exc) {
            console.error('Error running script: ' + exc);
            process.exit(1);
        }
    }
    
    // No script to run; just pass through the input
    return runtimeSettings.data;
}
