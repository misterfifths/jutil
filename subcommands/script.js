"use strict";

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
    var fs = require('fs'),
        vm = require('vm'),
        utils = require('../utils.js'),
        scriptPath,
        rawScript,
        script;
    
    if(opts.script && opts.scriptPath) {
        console.error('Error: You cannot specify both a script file (-i/--script) and an inline script.');
        process.exit(1);
    }

    if(opts.script) rawScript = opts.script;
    else if(opts.scriptPath) {
        try {
            scriptPath = utils.resolvePath(opts.scriptPath);
            rawScript = fs.readFileSync(scriptPath, 'utf8');
        }
        catch(exc) {
            console.error('Error: Unable to load script file "' + scriptPath + '": ' + exc);
            process.exit(1);
        }
    }
    
    if(rawScript) {
        script = '(function($) { ';
        if(runtimeSettings.withClause) script += 'with(($ === null || $ === undefined) ? {} : $) { ';
        script += rawScript + ';';
        if(runtimeSettings.withClause) script += ' }';
        script += ' }).call($$, $$);';
        
        try {
            return vm.runInContext(script, runtimeSettings.sandbox, { 'filename': runtimeSettings.scriptPath });
        }
        catch(exc) {
            console.error('Error running script: ' + exc);
            process.exit(1);
        }
    }
    
    // No script to run; just pass through the input
    return runtimeSettings.data;
}