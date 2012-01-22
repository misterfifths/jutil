#!/usr/bin/env node
;(function() {
"use strict";

var defaultConfig = {
    // All files with a .js extension in these directories will be loaded
    // before evaulating the input.
    moduleDirectories: ['~/.jutil/modules'],
    
    // Controls spacing in pretty-printed output (when using the default
    // prettyPrinter function). Can be a character (like '\t') or an
    // integer, in which case it represents a number of spaces to use.
    prettyPrintIndent: 4,
    
    // The function used to serialize an object into a human-readable
    // string (typically JSON, but if you override inputParser below,
    // could really be anything you want). The function takes two
    // arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // obj: the object to format
    // Return a 'pretty' string representation of obj.
    prettyPrinter: function(config, obj) {
        return JSON.stringify(obj, null, config.prettyPrintIndent) + '\n';
    },

    // The function used to serialize an object into a string when
    // pretty-printing is off (typically JSON, but really whatever,
    // as long as inputParser below understands it). The function
    // takes two arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // obj: the object to format
    // Return the string representation of obj.
    unprettyPrinter: function(config, obj) {
        return JSON.stringify(obj);
    },
    
    // The function used to deserialize the input string (typically JSON,
    // but you could override this to handle whatever) into an object.
    // The function takes two arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // input: the string to parse.
    // Return the deserialized object, or throw an exception if the
    // given string is not valid.
    inputParser: function(config, input) {
        return JSON.parse(input);
    },
    
    // Always pretty-print the output. Not recommend (as it's a waste of
    // cycles) if you do a lot of piping of output.
    alwaysPrettyPrint: false,
    
    // By default, if stdout is a terminal, the output will be pretty-printed
    // and, if it is larger than your window, piped into your pager (the PAGER
    // environment variable or 'less', by default). Setting this to true
    // disables that behavior.
    disableSmartOutput: false,
    
    // Always sort keys in the output. Useful for automated testing or
    // doing diffs against the results.
    alwaysSortKeys: false,
    
    // For commands that take a script to execute, don't wrap that script
    // inside "with($) { ... }", which is the default behavior. The clause
    // makes for less typing (you can reference properties of the input data
    // without "$." before them), but can cause issues if the data has a
    // property with a name that hides some useful variable or function.
    disableWithClause: false,
    
    // Always attempt to extract a useful property of the incoming data.
    // This passes the incoming data through the autoUnwrapper function
    // before running the script against it.
    alwaysAutoUnwrap: false,
    
    // A list of property names to be extracted when using the default
    // autoUnwrapper function.
    autoUnwrapProperties: [],
    
    // The function used to attempt to extract a useful property of the
    // incoming data. The function takes 2 arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // obj: the object parsed from the incoming data
    // It should return a "useful" property from obj (or obj itself if
    // appropriate). "Useful" can mean many things, but really this is
    // intended to handle JSON APIs that returned arrays wrapped in
    // objects, to work around the issue discussed here: http://bit.ly/m3el.
    // The default function does the following:
    // If obj is an object that only has one property, and the value of
    // that property is an object or an array, return that value.
    // Otherwise if obj has a property named the same as one in the
    // autoUnwrapProperties array, the value of the first matching
    // property is returned.
    autoUnwrapper: function(config, obj) {
        if(typeof obj != 'object' || Array.isArray(obj))
            return obj;

        var propName,
            onlyPropName,
            foundOne = false,
            val,
            i;

        for(propName in obj) {
            if(obj.hasOwnProperty(propName)) {
                foundOne = true;
            
                if(onlyPropName) {
                    onlyPropName = undefined;
                    break;
                }

                onlyPropName = propName;
            }
        }
        
        if(!foundOne) {
            // This object has no properties; nothing we can do
            return obj;
        }
        
        if(onlyPropName) {
            val = obj[onlyPropName];
            if(typeof val == 'object' && val !== null)
                return val;
        }
        
        // More than one property. Cross-reference with autoUnwrapProperties
        for(i = 0; i < config.autoUnwrapProperties.length; i++) {
            propName = config.autoUnwrapProperties[i];
            if(obj.hasOwnProperty(propName))
                return obj[propName];
        }
        
        // No luck; pass through original object
        return obj;
    }
};

// For now (?) we do nothing if imported elsewhere via require
if(require.main == module) {
    parseCommandLine({
        script: {
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
        },
        
        where: {
            help: 'Iterate over the input, returning only objects that match the given predicate.',
            options: {
                predicate: {
                    position: 1,
                    required: true,
                    help: 'Predicate to evaluate for each object in the loaded data. (Required)'
                }
            },
            outputsObject: true,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: whereCommandHandler
        },
        
        first: {
            help: 'Iterate over the input, returning the first object that matches the given predicate.',
            options: {
                predicate: {
                    position: 1,
                    help: 'Predicate to evaluate for each object in the loaded data. If omitted, the first object from the input will be returned.'
                }
            },
            outputsObject: true,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: firstCommandHandler
        },
        
        count: {
            help: 'Iterate over the input, counting the objects that match the given predicate.',
            options: {
                predicate: {
                    position: 1,
                    help: 'Predicate to evaluate for each object in the loaded data. If omitted, all objects will be counted.'
                }
            },
            outputsObject: false,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: countCommandHandler
        },
        
        select: {
            help: 'Iterate over the input, accumulating the result of the given expression for each object.',
            options: {
                shaper: {
                    position: 1,
                    required: true,
                    help: 'Expression to evaluate for each object in the loaded data. (Required)'
                }
            },
            outputsObject: true,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: selectCommandHandler
        },
        
        props: {
            help: 'Iterate over the input, returning only the given properties of each object.',
            options: {
                propMappings: {
                    position: 1,
                    list: true,
                    required: true,
                    help: 'Names of properties to extract from each object in the loaded data. These are of the form [[key.]*key=][key.]*key, to follow subobjects and optionally rename them in the output. (At least one is required)'
                }
            },
            outputsObject: true,
            needsSandbox: false,
            hasWithClauseOpt: false,
            handler: propsCommandHandler
        },
        
        format: {
            help: 'Iterate over the input, printing the result of the given format string for each object.',
            options: {
                format: {
                    position: 1,
                    required: true,
                    help: 'The format string to use. Tokens are of the form %property or %{expression}. (Required)'
                },
                header: {
                    abbr: 'H',
                    metavar: 'FORMAT',
                    help: 'A header to print before the main output; same token syntax as the format string and is evaluated against the data as a whole.',
                    type: 'string'
                },
                footer: {
                    abbr: 'F',
                    metavar: 'FORMAT',
                    help: 'A footer to print after the main output; same token syntax as the format string and is evaluated against the data as a whole.',
                    type: 'string'
                },
                noNewline: {
                    abbr: 'n',
                    full: 'no-newline',
                    flag: true,
                    help: 'Do not print trailing newline characters after every line.'
                }
            },
            outputsObject: false,
            hasSmartOutput: true,  // format doesn't spit out JSON, but we do want its output to be subject to autopaging
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: formatCommandHandler
        },

        sort: {
            help: 'Sort the objects in the input by a given key expression.',
            options: {
                sortKeyExpr: {
                    position: 1,
                    help: 'The expression that provides the sort key for each object in the loaded data. If omitted, defaults to the object itself.'
                },
                ignoreCase: {
                    abbr: 'i',
                    full: 'ignore-case',
                    flag: true,
                    help: 'Ignore case when comparing string sort keys.'
                },
                descending: {
                    abbr: 'r',
                    full: 'reverse',
                    flag: true,
                    help: 'Reverse the result of comparisons; output objects in descending order.'
                }
            },
            outputsObject: true,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: sortCommandHandler
        }
    });
}


// Basic script command

function scriptCommandHandler(runtimeSettings, config, opts)
{
    var fs = require('fs'),
        vm = require('vm'),
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
            scriptPath = resolvePath(opts.scriptPath);
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
        script += ' }).call($data, $data);';
        
        try {
            return vm.runInContext(script, runtimeSettings.sandbox, runtimeSettings.scriptPath);
        }
        catch(exc) {
            console.error('Error running script: ' + exc);
            process.exit(1);
        }
    }
    
    // No script to run; just pass through the input
    return runtimeSettings.data;
}


/// Predicate-based commands (where, first, count)

function whereCommandHandler(runtimeSettings, config, opts)
{
    var res = [];
    
    runPredicate(runtimeSettings, opts, function(match) {
        res.push(match);
        return true;
    });
    
    return res;
}

function firstCommandHandler(runtimeSettings, config, opts)
{
    var res;

    if(!opts.predicate)
        opts.predicate = 'true';
    
    runPredicate(runtimeSettings, opts, function(match) {
        res = match;
        return false;
    });
    
    return res;
}

function countCommandHandler(runtimeSettings, config, opts)
{
    var res = 0;
    
    if(!opts.predicate)
        opts.predicate = 'true';
    
    runPredicate(runtimeSettings, opts, function(match) {
        res++;
        return true;
    });
    
    return res.toString() + '\n';
}

function mapOverInput(expr, runtimeSettings, handleOne)
{
    function applyToValue(valueStr)
    {
        // If the array contains undefined or null, this gets funky.
        // Function.apply() with one of those turns 'this' into the global
        // object, which is not what was intended, certainly. That's
        // why we recommend using $ to access the data, rather than 'this'.
        // Ewwww... also doing function.apply(<primitive>) will cause the
        // primitive to be autoboxed, which may do Bad Things.
        var script = '(function($) { ';
        if(runtimeSettings.withClause) script += 'with(($ === null || $ === undefined) ? {} : $) { ';
        script += 'return (' + expr + ');';
        if(runtimeSettings.withClause) script += ' }';
        script += ' }).call(' + valueStr + ', ' + valueStr + ');';
        
        return vm.runInContext(script, runtimeSettings.sandbox);
    }
    
    var vm = require('vm'),
        data = runtimeSettings.data,
        i;
    
    // TODO: there's probably a better way to do this, all inside the sandbox,
    // rather than a bunch of calls into it. But eh, will it make that much
    // of a difference, speed-wise?
    
    if(Array.isArray(data)) {
        for(i = 0; i < data.length; i++) {
            if(!handleOne(data[i], applyToValue('$data[' + i + ']')))
                return;
        }
    }
    else
        handleOne(data, applyToValue('$data'));
}

function runPredicate(runtimeSettings, opts, handleMatch)
{
    // This means of detecting falsiness breaks down for boxed booleans:
    // for instance, !!(new Boolean(false)) is true, which is totally obnoxious.
    // This shouldn't be a problem if people don't use 'this' to refer to the
    // current datum, this sidestepping boxing.
    var expr = '!!(' + opts.predicate + ')';
    
    mapOverInput(expr, runtimeSettings, function(raw, matched) {
        if(matched)
            return handleMatch(raw);
        
        return true;
    });
}


//// Shaping commands (select, props, format)

function selectCommandHandler(runtimeSettings, config, opts)
{
    // TODO: maybe an option to omit falsy results

    var res = [];
    
    mapOverInput(opts.shaper, runtimeSettings, function(raw, shaped) {
        res.push(shaped);
        return true;
    });
    
    return res;
}

function propsCommandHandler(runtimeSettings, config, opts)
{
    function getKeyPath(obj, path)
    {
        var dotIdx,
            pathComponent,
            arrayMap;
        
        // We're done; obj is the value we want
        if(path === undefined)
            return { value: obj };
        
        // Can't go any further; we didn't succeed
        if(obj === null || obj === undefined)
            return undefined;
        
        // Traverse arrays by mapping the key path getter over every element
        if(Array.isArray(obj)) {
            arrayMap = obj.map(function(o) {
                var res = getKeyPath(o, path);
                if(res)
                    return res.value;
                
                return {};
            });
            
            return { value: arrayMap };
        }
        
        dotIdx = path.indexOf('.');
        if(dotIdx == -1) {
            pathComponent = path;
            path = undefined;
        }
        else {
            pathComponent = path.substring(0, dotIdx);
            path = path.substring(dotIdx + 1);
        }
        
        if(!obj.hasOwnProperty(pathComponent))
            return undefined;
        
        return getKeyPath(obj[pathComponent], path);
    }
    
    function setKeyPath(obj, path, value)
    {
        var i = 0,
            pathComponent;
        
        path = path.split('.');
        while(i < path.length - 1) {
            pathComponent = path[i];
            
            if(!obj.hasOwnProperty(pathComponent))
                obj[pathComponent] = {};
            
            obj = obj[pathComponent];
            i++;
        }
        
        obj[path[i]] = value;
    }
    
    function shapeObj(obj)
    {
        var i,
            mapping,
            res = {},
            val;
        
        for(i = 0; i < propMappings.length; i++) {
            mapping = propMappings[i];
            val = getKeyPath(obj, mapping.from);
            
            if(val)
                setKeyPath(res, mapping.to, val.value);
        }
        
        return res;
    }
    
    var res = [],
        data = runtimeSettings.data,
        propMappings = [],
        i, s, from, to;
        
    for(i = 0; i < opts.propMappings.length; i++) {
        s = opts.propMappings[i].split('=');
        
        if(s.length == 1 && s[0].length > 0)
            from = to = s[0];
        else if(s.length == 2 && s[0].length > 0 && s[1].length > 0) {
            to = s[0];
            from = s[1];
        }
        else {
            console.error('Invalid property mapping: ' + opts.propMappings[i]);
            process.exit(1);
        }
        
        propMappings.push({ from: from, to: to });
    }
    
    if(Array.isArray(data))
        return data.map(shapeObj);
    
    return shapeObj(data);
}

function formatCommandHandler(runtimeSettings, config, opts)
{
    function replacerFactory(data, dataString)
    {
        return function(match, unbracketed, bracketed) {
            // Short-circuit this case; this can only be a property name
            // of the object
            if(unbracketed)
                return data[unbracketed];
            
            // Otherwise, evaluate the expression
            // TODO: slight modifications on this are used in a few places;
            // would be good to make this a function.
            var res,
                script = '(function($) { ';
            if(runtimeSettings.withClause) script += 'with(($ === null || $ === undefined) ? {} : $) { ';
            script += 'return (' + bracketed + ');';
            if(runtimeSettings.withClause) script += ' }';
            script += ' }).call(' + dataString + ', ' + dataString + ');';

            res = vm.runInContext(script, runtimeSettings.sandbox);
            if(res === null) return 'null';
            if(res === undefined) return 'undefined';
            return res.toString();
        };
    }

    function prepareFormatString(format)
    {
        // Thanks, JS, for not having lookbehinds in your regexes.
        return format.replace(/(\\)?\\n/gm, function(match, escape) { return escape ? '\\n' : '\n'; })
                     .replace(/(\\)?\\t/gm, function(match, escape) { return escape ? '\\t' : '\t'; })
                     .replace(/(\\)?\\r/gm, function(match, escape) { return escape ? '\\r' : '\r'; });
    }

    /*
    bracketed: /%\{(?=[^}]*\})([^}]*)\}/
    unbracketed: /%([\w$]+)/
    */

    var vm = require('vm'),
        format = opts.format,
        re = /%([\w%]+)|%\{(?=[^}]*\})([^}]*)\}/gm,
        data = runtimeSettings.data,
        i,
        replacer,
        preparedFormatString,
        newline = opts.noNewline ? '' : '\n',
        res = '';
    
    if(opts.header) {
        replacer = replacerFactory(data, '$data');

        if(opts.header)
            res += prepareFormatString(opts.header).replace(re, replacer) + newline;
    }

    preparedFormatString = prepareFormatString(format);

    if(Array.isArray(data)) {
        for(i = 0; i < data.length; i++) {
            replacer = replacerFactory(data[i], '$data[' + i + ']');
            res += preparedFormatString.replace(re, replacer) + newline;
        }
    }
    else {
        replacer = replacerFactory(data, '$data');
        res += preparedFormatString.replace(re, replacer) + newline;
    }

    if(opts.footer) {
        replacer = replacerFactory(data, '$data');

        if(opts.footer)
            res += prepareFormatString(opts.footer).replace(re, replacer) + newline;
    }

    return res;
}


//// Sort command

function sortCommandHandler(runtimeSettings, config, opts)
{
    var vm = require('vm'),
        data = runtimeSettings.data,
        keyedData = [],
        i,
        expr = opts.sortKeyExpr || '$';  // default sort key is the whole object
    
    if(!Array.isArray(data))
        return data;
    
    // Generate keys and stash them in keyedData
    mapOverInput(expr, runtimeSettings, function(obj, key) {
        keyedData.push({ key: key, obj: obj });
        return true;
    });

    // Sort keyedData on keys
    keyedData.sort(function(x, y) {
        if(opts.ignoreCase) {
            if(typeof x.key == 'string') x.key = x.key.toLowerCase();
            if(typeof y.key == 'string') y.key = y.key.toLowerCase();
        }

        if(x.key == y.key) return 0;
        if(x.key < y.key) return opts.descending ? 1 : -1;
        return opts.descending ? -1 : 1;
    });

    // Unwrap the objects in keyedData
    for(i = 0; i < keyedData.length; i++)
        data[i] = keyedData[i].obj;
    
    return data;
}


//// Guts

function runCommand(commandDesc, opts)
{
    var config = loadConfig(defaultConfig, opts.configPath),
        runtimeSettings = makeRuntimeSettings(commandDesc, config, opts),
        res = commandDesc.handler(runtimeSettings, config, opts);

    if(commandDesc.outputsObject)
        outputObject(res, runtimeSettings, config);
    else
        outputString(res, runtimeSettings, config);
}

// Merges config and command line options down into a friendly object, which
// includes searching module directories for .js files and loading them into
// a sandbox, as well as loading and parsing the input file (or stdin).
function makeRuntimeSettings(commandDesc, config, opts)
{
    var fs = require('fs'),
        vm = require('vm'),
        isatty = require('tty').isatty(process.stdout.fd),
        settings = {},
        dirs;
    
    if(commandDesc.hasSmartOutput) {
        if(opts.disableSmartOutput || !isatty) settings.smartOutput = false;
        else settings.smartOutput = opts.disableSmartOutput === false || !config.disableSmartOutput;
    }

    if(commandDesc.outputsObject) {
        if(opts.prettyPrint || config.alwaysPrettyPrint || settings.smartOutput)
            settings.outputFormatter = config.prettyPrinter;
        else
            settings.outputFormatter = config.unprettyPrinter;
    
        if(opts.sortKeys === false) {} // --no-sort-keys
        else if(opts.sortKeys || config.alwaysSortKeys) settings.sortKeys = true;
    }
    
    if(commandDesc.hasWithClauseOpt) {
        if(opts.disableWithClause) settings.withClause = false;
        else settings.withClause = opts.disableWithClause === false || !config.disableWithClause;
    }
    
    if(opts.autoUnwrap === false) { }  // --no-auto-unwrap
    else if(opts.autoUnwrap || config.alwaysAutoUnwrap)
        settings.unwrapper = config.autoUnwrapper;
    
    if(opts.unwrapProperty)
        settings.unwrapper = function(config, obj) { return obj[opts.unwrapProperty]; };
    
    settings.verbose = opts.verbose;
    
    if(opts.file)
        settings.file = opts.file;
    else
        settings.file = '/dev/stdin';
    
    try {
        settings.input = fs.readFileSync(settings.file, 'utf8');
    }
    catch(exc) {
        console.error('Error: Unable to load input file "' + settings.file + '": ' + exc);
        process.exit(1);
    }
    
    settings.inputParser = config.inputParser;
    
    try {
        settings.data = settings.inputParser(config, settings.input);
    }
    catch(exc) {
        console.error('Error parsing input: ' + exc + '.\nInput:\n' + settings.input);
        process.exit(1);
    }
    
    if(settings.unwrapper)
        settings.data = settings.unwrapper(config, settings.data);
    
    // Find modules and load them into a sandbox if the command needs it,
    // and throw the data in there too as $data
    if(commandDesc.needsSandbox) {
        if(opts.moduleDirectories && opts.moduleDirectories[0] === false) // nomnom turns --no-<list option> into [false]
            settings.modulePaths = [];
        else if(opts.moduleDirectories) {
            dirs = opts.moduleDirectories;
            dirs.push.apply(dirs, config.moduleDirectories);
            settings.modulePaths = findModules(dirs);
        }
        else
            settings.modulePaths = findModules(config.moduleDirectories);
        
        if(opts.modulePaths && opts.modulePaths[0] !== false)
            settings.modulePaths.push.apply(settings.modulePaths, opts.modulePaths);
    
        settings.sandbox = vm.createContext({
            $config: config,
            $data: settings.data,
            console: console,
            out: console.log,
            process: process,
            require: require
        });
        
        loadModules(settings.modulePaths, settings.sandbox);
    }
    
    return settings;
}

function loadModules(modulePaths, sandbox)
{
    var fs = require('fs'),
        vm = require('vm'),
        i,
        modulePath,
        moduleContents;

    for(i = 0; i < modulePaths.length; i++) {
        modulePath = modulePaths[i];
    
        try {
            moduleContents = fs.readFileSync(modulePath, 'utf8');
            vm.runInContext(moduleContents, sandbox, modulePath);
        }
        catch(exc) {
            console.warn('Warning: error loading module "' + modulePath + '": ' + exc);
        }
    }
}

function outputString(str, runtimeSettings, config)
{
    var buffer,
        lineCount,
        pagerCmd,
        pagerSplit,
        pagerArgs = [],
        pager;

    if(runtimeSettings.smartOutput) {
        lineCount = str.length - str.replace(new RegExp('\n', 'g'), '').length;
        if(lineCount > process.stdout.getWindowSize()[1]) {
            // Autopage
            pagerCmd = process.env.PAGER || 'less';

            // TODO: this is a pretty naive processing of arguments embedded in $PAGER
            if(pagerCmd.indexOf(' ') != -1) {
                pagerSplit = pagerCmd.split(' ');
                pagerCmd = pagerSplit[0];
                pagerArgs = pagerSplit.slice(1);
            }
            
            pager = require('child_process')
                .spawn(pagerCmd, pagerArgs, {
                    customFds: [-1, process.stdout.fd, -1]
                });
            
            pager.stderr.setEncoding('utf8');
            pager.stderr.on('data', function(data) {
                console.error('Error running pager command ("' + pagerCmd + '"): ' + data);
                process.exit(1);
            });
             
            pager.stdin.end(str);
            pager.stdin.on('error', function(exc) {
                // Silence EPIPE; just means that they closed the pager before
                // we finished writing (or the pager never started, in which
                // case the stderr output will be sufficient).
                if(exc.code != 'EPIPE')
                    throw exc;
            });
            
            return;
        }
    }
    
    // process.stdout.write seems like the obvious choice here, but
    // it causes an exception if we pipe a big result to something
    // and close the whole shebang before it can finish writing.
    // Should probably file a node bug...
    buffer = new Buffer(str);
    require('fs').write(process.stdout.fd, buffer, 0, buffer.length);
}

function outputObject(obj, runtimeSettings, config)
{
    if(obj === undefined)
        return;

    if(runtimeSettings.sortKeys)
        obj = sortObject(obj);

    try {
        obj = runtimeSettings.outputFormatter(config, obj);
    }
    catch(exc) {
        console.error('Error converting result to string: ' + exc);
        process.exit(1);
    }
    
    if(typeof obj != 'string') {
        // JSON.stringify will return undefined if the top-level object is
        // a function or an XML object, neither of which should ever happen,
        // so we're just ignoring this for now.
        return;
    }

    outputString(obj, runtimeSettings, config);
}


//// Command line parsing

function parseCommandLine(commands)
{
    var args = process.argv.slice(2),  // remove 'node' and script name
        defaultCommand = 'script',
        scriptName = require('path').basename(process.argv[1], '.js'),
        firstArg = args[0],
        parser = require('nomnom'),
        globalOpts,
        objectOutputOpts,
        smartOutputOpt,
        sandboxOpts,
        withClauseOpt,
        commandName,
        commandDesc,
        commandObj;
    
    globalOpts = {
        unwrapProperty: {
            abbr: 'u',
            metavar: 'KEY',
            full: 'unwrap-prop',
            type: 'string',
            help: 'Operate only against the given property of the loaded data.'
        },
        autoUnwrap: {
            abbr: 'a',
            full: 'auto-unwrap',
            flag: true,
            help: 'Attempt to intelligently extract a useful property of the loaded data to run against.'
        },
        file: {
            abbr: 'f',
            metavar: 'FILE',
            help: 'Load data from the given file instead of reading from stdin.',
            type: 'string'
        },
        configPath: {
            abbr: 'c',
            full: 'config',
            metavar: 'FILE',
            help: 'Load the given config file. The default is ~/.jutil/config; specify --no-config to use the default configuration.',
            type: 'string',
            'default': '~/.jutil/config'
        },
        verbose: {
            abbr: 'v',
            flag: true,
            help: 'Be verbose about things (e.g. module loading).'
        }
    };
    
    objectOutputOpts = {
        prettyPrint: {
            abbr: 'p',
            full: 'pretty-print',
            flag: true,
            help: 'Pretty-print the output.'
        },
        sortKeys: {
            abbr: 's',
            full: 'sort-keys',
            flag: true,
            help: 'Sort keys in the output.'
        }
    };

    smartOutputOpt = {
        disableSmartOutput: {
            abbr: 'S',
            full: 'disable-smart',
            flag: true,
            help: 'Don\'t pretty-print or autopage if stdout is a terminal.'
        }
    };
    
    sandboxOpts = {
        moduleDirectories: {
            abbr: 'M',
            full: 'module-dir',
            metavar: 'DIR',
            list: true,
            type: 'string',
            help: 'Add the given directory as a module path. Any .js files in the directory will be loaded before executing. Specify --no-module-dir to disable module directory loading.'
        },
        modulePaths: {
            abbr: 'm',
            full: 'module',
            metavar: 'FILE',
            list: true,
            type: 'string',
            help: 'Load the given JavaScript file before executing. You may repeat this option.'
        }
    };
    
    withClauseOpt = {
        disableWithClause: {
            abbr: 'W',
            full: 'disable-with',
            flag: true,
            help: 'Don\'t wrap the script to execute in a "with" clause.'
        }
    };
    
    // If we weren't invoked as 'jutil', we were called 'j<command name>',
    // which we massage into the first argument.
    if(scriptName != 'jutil')
        args.unshift(scriptName.substr(1));
    else if(!firstArg ||
            (firstArg != '-h' && firstArg != '--help' && !commands.hasOwnProperty(firstArg)))
    {
        // Otherwise, add in the default command 'script', if appropriate:
        // --help/-h -> no default
        // no first arg -> default
        // first arg is not a command name -> default
        
        args.unshift(defaultCommand);
    }
    
    parser.script('jutil');
    parser.printer(function(str, code) {
        // Wrap the output at terminal width or 80 characters (if not a terminal)
        var isatty = require('tty').isatty(process.stdout.fd),
            width = isatty ? process.stdout.getWindowSize()[0] : 80,
            wrap = require('wordwrap')(width);

        str = wrap(str) + '\n';
        code = code || 0;

        if(code === 0)
            process.stdout.write(str);
        else
            process.stderr.write(str);
        
        process.exit(code);
    });

    if(require('tty').isatty(process.stdout.fd))
        parser.colors();
    
    parser
        .nocommand()
        .help('Run jutil <command> --help to see command-specific options.\nIf no command is specified, the default is "' + defaultCommand + '".');
    
    for(commandName in commands) {
        if(commands.hasOwnProperty(commandName)) {
            commandDesc = commands[commandName];
            commandObj = parser.command(commandName);
            
            commandObj.help(commandDesc.help);
            
            // nomnom seems to freak out if we call options() more than once
            // on a command object, wo we're gathering all the options in one
            // place to just make one call.
            
            shallowCopy(globalOpts, commandDesc.options);
            
            if(commandDesc.outputsObject) {
                commandDesc.hasSmartOutput = true;  // outputsObject implies hasSmartOutput
                shallowCopy(objectOutputOpts, commandDesc.options);
            }

            if(commandDesc.hasSmartOutput)
                shallowCopy(smartOutputOpt, commandDesc.options);
            
            if(commandDesc.needsSandbox)
                shallowCopy(sandboxOpts, commandDesc.options);
            
            if(commandDesc.hasWithClauseOpt)
                shallowCopy(withClauseOpt, commandDesc.options);
            
            commandObj.options(commandDesc.options);
            
            // Go go gadget JS scoping rules!!!
            (function(commandDesc) {
                commandObj.callback(function(opts) {
                    runCommand(commandDesc, opts);
                });
            })(commandDesc);
        }
    }
    
    return parser.parse(args);
}


//// Configuration file handling

function loadConfig(defaultConfig, configPath)
{
    var fs = require('fs'),
        vm = require('vm'),
        config = {},
        realConfigPath,
        configFile,
        configSandbox,
        propName,
        defaultConfigProperties,
        userConfig;
        
    shallowCopy(defaultConfig, config);

    if(!configPath)
        return config;

    try {
        realConfigPath = resolvePath(configPath);
        configFile = fs.readFileSync(realConfigPath, 'utf8');
        configSandbox = vm.createContext({
            console: console,
            out: console.log,
            process: process,
            require: require
        });
        
        vm.runInContext(configFile, configSandbox, realConfigPath);
        userConfig = configSandbox.config;
    }
    catch(exc) {
        // It's fine if we didn't find a config file; we'll use the defaults
        if(exc.code == 'ENOENT')
            return config;
        else {
            console.error('Error loading configuration file: ' + exc);
            process.exit(1);
        }
    }

    if(userConfig) {
        // Validate config file and merge it with the defaults.
        
        copyStringArraySetting(userConfig, config, 'moduleDirectories');
        copyFunctionSetting(userConfig, config, 'prettyPrinter', 2);
        copyFunctionSetting(userConfig, config, 'unprettyPrinter', 2);
        copyFunctionSetting(userConfig, config, 'inputParser', 3);
        copyBooleanSetting(userConfig, config, 'alwaysSortKeys');
        copyBooleanSetting(userConfig, config, 'alwaysPrettyPrint');
        copyBooleanSetting(userConfig, config, 'alwaysAutoUnwrap');
        copyStringArraySetting(userConfig, config, 'autoUnwrapProperties');
        copyFunctionSetting(userConfig, config, 'autoUnwrapper', 2);
        copyBooleanSetting(userConfig, config, 'disableWithClause');
        copyBooleanSetting(userConfig, config, 'disableSmartOutput');
        
        if(userConfig.hasOwnProperty('prettyPrintIndent')) {
            switch(typeof userConfig.prettyPrintIndent) {
                case 'string':
                case 'number':
                    config.prettyPrintIndent = userConfig.prettyPrintIndent;
                    break;
                
                default:
                    console.warn('Warning: prettyPrintIndent property in config file must be a number or string; ignoring the setting');
            }
        }
        
        // Copy over any other properties from the config file
        for(propName in userConfig) {
            if(userConfig.hasOwnProperty(propName) &&
               !defaultConfig.hasOwnProperty(propName))
            {
                config[propName] = userConfig[propName];
            }
        }
    }
    else
        console.warn('Warning: config file must assign to the global "config" var; ignoring the file');
    
    return config;
}

function copyStringArraySetting(userConfig, config, name)
{
    var val, i;

    if(userConfig.hasOwnProperty(name)) {
        val = userConfig[name];
    
        if(Array.isArray(val)) {
            for(i = 0; i < val.length; i++) {
                if(typeof val[i] != 'string') {
                    console.warn('Warning: ' + name + ' property in config file must contain only string elements; ignoring the setting');
                    return;
                }
            }
            
            config[name] = val;
        }
        else
            console.warn('Warning: ' + name + ' property in config file must be an array; ignoring the setting');
    }
}

function copyFunctionSetting(userConfig, config, name, arity)
{
    if(userConfig.hasOwnProperty(name)) {
        var val = userConfig[name];
    
        if(typeof val == 'function') {
            if(val.length == arity)
                config[name] = val;
            else
                console.warn('Warning: ' + name + ' function in config file must take exactly ' + arity + ' arguments; ignoring the setting');
        }
        else
            console.warn('Warning: ' + name + ' property in config file must be a function; ignoring the setting');
    }
}

function copyBooleanSetting(userConfig, config, name)
{
    if(userConfig.hasOwnProperty(name)) {
        if(typeof userConfig[name] == 'boolean')
            config[name] = userConfig[name];
        else
            console.warn('Warning: ' + name + ' property in config file must be a boolean; ignoring the setting');
    }
}


//// Helpers

function resolvePath(p)
{
    var path = require('path');
    
    switch(p.charAt(0)) {
        case '~': return path.join(process.env.HOME, p.substr(1));
        case '/': return p;
        default: return path.join(process.cwd(), p);
    }
}

function shallowCopy(source, dest)
{
    var keys = Object.keys(source),
        i,
        key;
    
    for(i = 0; i < keys.length; i++) {
        key = keys[i];
        dest[key] = source[key];
    }
}

function findModules(dirs)
{
    var fs = require('fs'),
        path = require('path'),
        paths = [],
        moduleDir,
        allFiles,
        i,
        j,
        file;
    
    for(i = 0; i < dirs.length; i++) {
        moduleDir = resolvePath(dirs[i]);
        allFiles = [];
        
        try {
            allFiles = fs.readdirSync(moduleDir);
        }
        catch(exc) {
            // No warning if module directory is nonexistent
            if(exc.code != 'ENOENT')
                console.warn('Warning: error reading module directory "' + moduleDir + '": ' + exc);
        }
        
        for(j = 0; j < allFiles.length; j++) {
            file = allFiles[j];
            if(path.extname(file).toLowerCase() == '.js')
                paths.push(path.join(moduleDir, file));
        }
    }
    
    return paths;
}

function sortObject(obj)
{
    // This relies on the JavaScript interpreter placing some importance
    // on the order in which keys were added to an object. Luckily V8
    // does that, at least for now...
    
    var sortedKeys, sortedObj, i, key;

    if(obj === null || obj === undefined)
        return obj;

    // Don't be fooled by boxed primitives
    // For some reason, instanceof was lying here, and direct comparison of
    // constructors to functions was failing too. Have a feeling it has to
    // do with the fact that these objects crossed the sandbox boundary...
    // Oof.
    if(obj.constructor.name == 'String' ||
       obj.constructor.name == 'Number' ||
       obj.constructor.name == 'Boolean')
        return obj.valueOf();

    if(typeof obj != 'object')
        return obj;
    
    if(Array.isArray(obj))
        return obj.map(sortObject);

    sortedKeys = Object.keys(obj).sort();
    sortedObj = {};

    for(i = 0; i < sortedKeys.length; i++) {
        key = sortedKeys[i];
        sortedObj[key] = sortObject(obj[key]);
    }
    
    return sortedObj;
}

})();
