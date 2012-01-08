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
    // JSON string. The function takes two arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // obj: the object to format
    // Return the formatted JSON string.
    prettyPrinter: function(config, obj) {
        return JSON.stringify(obj, null, config.prettyPrintIndent) + '\n';
    },
    
    // The function used to deserialize a JSON string into an object.
    // The function takes two arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // json: the JSON string to parse.
    // Return the deserialized object, or throw an exception if the
    // given string is not valid JSON.
    jsonParser: function(config, json) {
        return JSON.parse(json);
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
    alwaysSort: false,
    
    // For commands that take a script to execute, don't wrap that script
    // inside "with(this) { ... }", which is the default behavior. The clause
    // makes for less typing (you can reference properties of the input data
    // without "this." before them), but can cause issues if the data has a
    // property with a name that hides some useful variable or function.
    disableWithClause: false,
    
    // Always attempt to extract a useful property of the incoming JSON.
    // This passes the incoming data through the autoUnwrapper function
    // before running the script against it.
    alwaysAutoUnwrap: false,
    
    // A list of property names to be extracted when using the default
    // autoUnwrapper function.
    autoUnwrapProperties: [],
    
    // The function used to attempt to extract a useful property of the
    // incoming JSON. The function takes 2 arguments:
    // config: the current application configuration, as specified in
    // the configuration file
    // obj: the object parsed from the incoming JSON
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
            help: 'Run a script against the loaded data. Its return value will be printed as JSON.',
            options: {
                script: {
                    position: 1,
                    help: 'Script to run against the loaded JSON; may also be loaded from a file via the -i option.'
                },
                scriptPath: {
                    abbr: 'i',
                    full: 'script',
                    metavar: 'FILE',
                    help: 'Load the script to run from the given file instead of the first positional argument.',
                    type: 'string'
                }
            },
            outputsJSON: true,
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
                    help: 'Predicate to evaluate for each object in the loaded JSON. (Required)'
                }
            },
            outputsJSON: true,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: whereCommandHandler
        },
        
        first: {
            help: 'Iterate over the input, returning the first object that matches the given predicate.',
            options: {
                predicate: {
                    position: 1,
                    help: 'Predicate to evaluate for each object in the loaded JSON. If omitted, the first object from the input will be returned.'
                }
            },
            outputsJSON: true,
            needsSandbox: true,
            hasWithClauseOpt: true,
            handler: firstCommandHandler
        },
        
        count: {
            help: 'Iterate over the input, counting the objects that match the given predicate.',
            options: {
                predicate: {
                    position: 1,
                    help: 'Predicate to evaluate for each object in the loaded JSON. If omitted, all objects will be counted.'
                }
            },
            outputsJSON: false,
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
                    help: 'Expression to evaluate for each object in the loaded JSON. (Required)'
                }
            },
            outputsJSON: true,
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
                    help: 'Names of properties to extract from each object in the loaded JSON. These are of the form [[key.]*key=][key.]*key, to follow subobjects and optionally rename them in the output. (At least one is required)'
                }
            },
            outputsJSON: true,
            needsSandbox: false,
            hasWithClauseOpt: false,
            handler: propsCommandHandler
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
        script = '(function() { ';
        if(runtimeSettings.withClause) script += 'with(this) { ';
        script += rawScript + ';';
        if(runtimeSettings.withClause) script += ' }';
        script += ' }).apply($data);';
        
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
    
    process.stdout.write(res.toString() + '\n');
}

function mapOverInput(expr, runtimeSettings, handleOne)
{
    function applyToValue(valueStr)
    {
        // TODO: if the array contains undefined or null, this gets funky.
        // Function.apply() with one of those turns 'this' into the global
        // object, which is not what was intended, certainly.
        var script = '(function() { ';
        if(runtimeSettings.withClause) script += 'with(this) { ';
        script += 'return (' + expr + ');';
        if(runtimeSettings.withClause) script += ' }';
        script += ' }).apply(' + valueStr + ');';
        
        return vm.runInContext(script, runtimeSettings.sandbox, runtimeSettings.scriptPath);
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
    var expr = '!!(' + opts.predicate + ')';
    
    mapOverInput(expr, runtimeSettings, function(raw, matched) {
        if(matched)
            return handleMatch(raw);
        
        return true;
    });
}


//// Shaping commands (select, props)

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


//// Guts

function runCommand(commandDesc, opts)
{
    var config = loadConfig(defaultConfig, opts.configPath),
        runtimeSettings = makeRuntimeSettings(commandDesc, config, opts),
        res = commandDesc.handler(runtimeSettings, config, opts);

    if(commandDesc.outputsJSON)
        outputJSON(res, runtimeSettings, config);
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
    
    if(commandDesc.outputsJSON) {
        if(opts.disableSmartOutput) settings.smartOutput = false;
        else settings.smartOutput = opts.disableSmartOutput === false || !config.disableSmartOutput;
        
        if(opts.prettyPrint === false) {}  // --no-pretty-print
        else if(opts.prettyPrint || config.alwaysPrettyPrint || (settings.smartOutput && isatty))
            settings.prettyPrinter = config.prettyPrinter;
    
        if(opts.sort === false) {} // --no-sort
        else if(opts.sort || config.alwaysSort) settings.sort = true;
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
        settings.json = fs.readFileSync(settings.file, 'utf8');
    }
    catch(exc) {
        console.error('Error: Unable to load JSON file "' + settings.file + '": ' + exc);
        process.exit(1);
    }
    
    settings.jsonParser = config.jsonParser;
    
    try {
        settings.data = settings.jsonParser(config, settings.json);
    }
    catch(exc) {
        console.error('Error parsing JSON: ' + exc + '.\nInput:\n' + settings.json);
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

function outputJSON(obj, runtimeSettings, config)
{
    var buffer,
        lineCount,
        pagerCmd,
        pager;

    if(obj === undefined)
        return;

    if(runtimeSettings.sort)
        obj = sortObject(obj);

    try {
        if(runtimeSettings.prettyPrinter)
            obj = runtimeSettings.prettyPrinter(config, obj);
        else
            obj = JSON.stringify(obj);
    }
    catch(exc) {
        console.error('Error converting result to JSON: ' + exc);
        process.exit(1);
    }
    
    if(typeof obj != 'string') {
        // JSON.stringify will return undefined if the top-level object is
        // a function or an XML object, neither of which should ever happen,
        // so we're just ignoring this for now.
        return;
    }
    
    if(runtimeSettings.smartOutput &&
       require('tty').isatty(process.stdout.fd))
    {
        lineCount = obj.length - obj.replace(new RegExp('\n', 'g'), '').length;
        if(lineCount > process.stdout.getWindowSize()[1]) {
            // Autopage
            pagerCmd = process.env.PAGER || 'less';
            
            pager = require('child_process')
                .spawn(pagerCmd, [], {
                    customFds: [-1, process.stdout.fd, -1]
                });
            
            pager.stderr.setEncoding('utf8');
            pager.stderr.on('data', function(data) {
                console.error('Error running pager command ("' + pagerCmd + '"): ' + data);
                process.exit(1);
            });
             
            pager.stdin.end(obj);
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
    buffer = new Buffer(obj);
    require('fs').write(process.stdout.fd, buffer, 0, buffer.length);
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
        jsonOutputOpts,
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
            help: 'Operate only against the given property of the loaded JSON.'
        },
        autoUnwrap: {
            abbr: 'a',
            full: 'auto-unwrap',
            flag: true,
            help: 'Attempt to intelligently extract a useful property of the loaded JSON to run against.'
        },
        file: {
            abbr: 'f',
            metavar: 'FILE',
            help: 'Load JSON from the given file instead of reading from stdin.',
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
    
    jsonOutputOpts = {
        prettyPrint: {
            abbr: 'p',
            full: 'pretty-print',
            flag: true,
            help: 'Pretty-print the output.'
        },
        sort: {
            abbr: 's',
            flag: true,
            help: 'Sort keys in the output.'
        },
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
            help: 'Load the given JavaScript file before executing.'
        }
    };
    
    withClauseOpt = {
        abbr: 'W',
        full: 'disable-with',
        flag: true,
        help: 'Don\'t wrap the script to execute in a "with" clause.'
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
            
            if(commandDesc.outputsJSON)
                shallowCopy(jsonOutputOpts, commandDesc.options);
            
            if(commandDesc.needsSandbox)
                shallowCopy(sandboxOpts, commandDesc.options);
            
            if(commandDesc.hasWithClauseOpt)
                commandDesc.options.disableWithClause = withClauseOpt;
            
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
        if(exc.code != 'ENOENT') {
            console.error('Error loading configuration file: ' + exc);
            process.exit(1);
        }
    }

    if(userConfig) {
        // Validate config file and merge it with the defaults.
        
        copyStringArraySetting(userConfig, config, 'moduleDirectories');
        copyFunctionSetting(userConfig, config, 'prettyPrinter', 2);
        copyFunctionSetting(userConfig, config, 'jsonParser', 3);
        copyBooleanSetting(userConfig, config, 'alwaysSort');
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
    
    if(typeof obj != 'object' || obj === null)
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