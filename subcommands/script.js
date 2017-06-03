"use strict";

const fs = require('fs'),
      vm = require('vm'),
      utils = require('../utils.js');

module.exports = {
    help: 'Run a script against the loaded data, outputting its return value.',
    options: {
        script: {
            position: 1,
            help: 'Script to run against the loaded data; may also be loaded from a file via the -i option.'
        },
        scriptPath: {
            abbr: 'i',
            full: 'script',
            metavar: 'FILE',
            help: 'Load the script to run from the given file instead of the first positional argument.',
            type: 'string'
        }
    },
    outputsObject: true,
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: scriptCommandHandler
};

function scriptCommandHandler(runtimeSettings, config, opts)
{
    let rawScript;

    if(opts.script && opts.scriptPath) {
        console.error('Error: You cannot specify both a script file (-i/--script) and an inline script.');
        process.exit(1);
    }

    if(opts.script) rawScript = opts.script;
    else if(opts.scriptPath) {
        let resolvedScriptPath = utils.resolvePath(opts.scriptPath);
        try {
            rawScript = fs.readFileSync(resolvedScriptPath, { 'encoding': 'utf8' });
        }
        catch(exc) {
            console.error('Error: Unable to load script file "' + resolvedScriptPath + '": ' + exc);
            process.exit(1);
        }
    }
    
    if(rawScript) {
        let script = '(function($) { ';
        if(runtimeSettings.withClause) script += 'with(($ === null || $ === undefined) ? {} : $) { ';
        script += rawScript + ';';
        if(runtimeSettings.withClause) script += ' }';
        script += ' }).call($$, $$);';
        
        try {
            return vm.runInContext(script, runtimeSettings.sandbox, { 'filename': opts.scriptPath });
        }
        catch(exc) {
            console.error('Error running script: ' + exc);
            process.exit(1);
        }
    }
    
    // No script to run; just pass through the input
    return runtimeSettings.data;
}
