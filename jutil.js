#!/usr/bin/env node
"use strict";

const vm = require('vm'),
      fs = require('fs'),
      path = require('path'),
      utils = require('./utils.js');

const defaultConfig = {
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
    prettyPrinter(config, obj) {
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
    unprettyPrinter(config, obj) {
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
    inputParser(config, input) {
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
    autoUnwrapper(config, obj) {
        if(typeof obj != 'object' || Array.isArray(obj))
            return obj;
        
        const propNames = Object.keys(obj);

        if(propNames.length === 0) {
            // Nothing to be done
            return obj;
        }
        else if(propNames.length == 1) {
            // One property. If it's an object, use it
            let val = obj[propNames[0]];
            if(typeof val == 'object' && val !== null)
                return val;
            else
                return obj;
        }
        
        // More than one property. Cross-reference with autoUnwrapProperties
        for(let propName of config.autoUnwrapProperties) {
            if(obj.hasOwnProperty(propName))
                return obj[propName];
        }
        
        // No luck; pass through original object
        return obj;
    }
};

// For now (?) we do nothing if imported elsewhere via require
if(require.main != module) {
    return;
}

parseCommandLine({
    script: require('./subcommands/script.js'),
    where: require('./subcommands/where.js'),
    first: require('./subcommands/first.js'),
    count: require('./subcommands/count.js'),
    select: require('./subcommands/select.js'),
    props: require('./subcommands/props.js'),
    format: require('./subcommands/format.js'),
    sort: require('./subcommands/sort.js'),
    join: require('./subcommands/join.js')
});


//// Guts

function runCommand(commandDesc, opts)
{
    let config = loadConfig(defaultConfig, opts.configPath),
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
    let settings = {};
    
    if(commandDesc.hasSmartOutput) {
        if(opts.disableSmartOutput || !process.stdout.isTTY) settings.smartOutput = false;
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
        settings.unwrapper = (config, obj) => obj[opts.unwrapProperty];
    
    settings.verbose = opts.verbose;

    settings.inputParser = config.inputParser;
    
    if(commandDesc.hasFileOption === undefined || commandDesc.hasFileOption) {
        if(opts.file)
            settings.file = opts.file;
        else
            settings.file = process.stdin.fd;

        settings.data = utils.loadJSON(settings.file, settings, config);
    }
    
    // Find modules and load them into a sandbox if the command needs it,
    // and throw the data in there too as $$
    if(commandDesc.needsSandbox) {
        if(opts.moduleDirectories && opts.moduleDirectories[0] === false) // nomnom turns --no-<list option> into [false]
            settings.modulePaths = [];
        else if(opts.moduleDirectories) {
            let dirs = opts.moduleDirectories;
            dirs.push.apply(dirs, config.moduleDirectories);
            settings.modulePaths = findModules(dirs);
        }
        else
            settings.modulePaths = findModules(config.moduleDirectories);
        
        if(opts.modulePaths && opts.modulePaths[0] !== false)
            settings.modulePaths.push.apply(settings.modulePaths, opts.modulePaths);
    
        settings.sandbox = vm.createContext({
            $config: config,
            $$: settings.data,
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
    for(let modulePath of modulePaths) {
        try {
            const moduleContents = utils.loadFile(modulePath, false);
            vm.runInContext(moduleContents, sandbox, { 'filename': modulePath });
        }
        catch(exc) {
            console.warn('Warning: error loading module "' + modulePath + '": ' + exc);
        }
    }
}

function stringHasMoreLinesThanStdout(str)
{
    const stdoutHeight = process.stdout.getWindowSize()[1];
    let lineCount = 0;
    for(let chr of str) {
        if(chr == '\n') {
            lineCount++;
            if(lineCount > stdoutHeight) return true;
        }
    }

    return false;
}

function outputString(str, runtimeSettings, config)
{
    if(runtimeSettings.smartOutput && stringHasMoreLinesThanStdout(str)) {
        // Autopage
        let pagerCmd = process.env.PAGER || 'less';
        let pagerArgs = [];

        // TODO: this is a pretty naive processing of arguments embedded in $PAGER
        if(pagerCmd.indexOf(' ') != -1) {
            let pagerSplit = pagerCmd.split(' ');
            pagerCmd = pagerSplit[0];
            pagerArgs = pagerSplit.slice(1);
        }

        let pager = require('child_process').spawn(pagerCmd, pagerArgs, {
                        stdio: ['pipe', process.stdout, 'pipe']
                    });

        pager.stderr.setEncoding('utf8');
        pager.stderr.on('data', data => {
            console.error('Error running pager command ("' + pagerCmd + '"): ' + data);
            process.exit(1);
        });

        pager.stdin.end(str);
        pager.stdin.on('error', exc => {
            // Silence EPIPE; just means that they closed the pager before
            // we finished writing (or the pager never started, in which
            // case the stderr output will be sufficient).
            if(exc.code != 'EPIPE')
                throw exc;
        });
    }
    else
        process.stdout.write(str);
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
    let args = process.argv.slice(2),  // remove 'node' and script name
        defaultCommand = 'script',
        scriptName = path.basename(process.argv[1], '.js'),
        firstArg = args[0],
        parser = require('nomnom'),
        shallowCopy = utils.shallowCopy;

    const globalOpts = {
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

    const fileOpt = {
        file: {
            abbr: 'f',
            metavar: 'FILE',
            help: 'Load data from the given file instead of reading from stdin.',
            type: 'string'
        }
    };
    
    const objectOutputOpts = {
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

    const smartOutputOpt = {
        disableSmartOutput: {
            abbr: 'S',
            full: 'disable-smart',
            flag: true,
            help: 'Don\'t pretty-print or autopage if stdout is a terminal.'
        }
    };
    
    const sandboxOpts = {
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
    
    const withClauseOpt = {
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
    parser.printer((str, code) => {
        // Wrap the output at terminal width or 80 characters (if not a terminal)
        let width = process.stdout.isTTY ? process.stdout.getWindowSize()[0] : 80,
            wrap = require('wordwrap')(width);

        str = wrap(str) + '\n';
        code = code || 0;

        if(code === 0)
            process.stdout.write(str);
        else
            process.stderr.write(str);
        
        process.exit(code);
    });

    if(process.stdout.isTTY)
        parser.colors();
    
    parser
        .nocommand()
        .help('Run jutil <command> --help to see command-specific options.\nIf no command is specified, the default is "' + defaultCommand + '".');
    
    Object.keys(commands).forEach(commandName => {
        let commandDesc = commands[commandName];
        let commandObj = parser.command(commandName);

        commandObj.help(commandDesc.help);

        // nomnom seems to freak out if we call options() more than once
        // on a command object, wo we're gathering all the options in one
        // place to just make one call.

        shallowCopy(globalOpts, commandDesc.options);

        // This one is on by default, so consider omission to be truthy
        if(commandDesc.hasFileOption === undefined || commandDesc.hasFileOption) {
            shallowCopy(fileOpt, commandDesc.options);
        }

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

        commandObj.callback(opts => runCommand(commandDesc, opts));
    });

    return parser.parse(args);
}


//// Configuration file handling

function loadConfig(defaultConfig, configPath)
{
    let config = {},
        userConfig;
        
    utils.shallowCopy(defaultConfig, config);

    if(!configPath)
        return config;

    try {
        let realConfigPath = utils.resolvePath(configPath);
        let configFile = utils.loadFile(realConfigPath, false);
        let configSandbox = vm.createContext({
            console: console,
            out: console.log,
            process: process,
            require: require
        });
        
        vm.runInContext(configFile, configSandbox, { 'filename': realConfigPath });
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
        for(let propName in userConfig) {
            if(userConfig.hasOwnProperty(propName) && !defaultConfig.hasOwnProperty(propName))
                config[propName] = userConfig[propName];
        }
    }
    else
        console.warn('Warning: config file must assign to the global "config" var; ignoring the file');
    
    return config;
}

function copyStringArraySetting(userConfig, config, name)
{
    if(userConfig.hasOwnProperty(name)) {
        let val = userConfig[name];
    
        if(Array.isArray(val)) {
            for(let valItem of val) {
                if(typeof valItem != 'string') {
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
        let val = userConfig[name];
    
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

function findModules(dirs)
{
    let paths = [];

    for(let rawDir of dirs) {
        let moduleDir = utils.resolvePath(rawDir);
        let allFiles = [];
        
        try {
            allFiles = fs.readdirSync(moduleDir);
        }
        catch(exc) {
            // No warning if module directory is nonexistent
            if(exc.code != 'ENOENT')
                console.warn('Warning: error reading module directory "' + moduleDir + '": ' + exc);
        }
        
        for(let file of allFiles) {
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

    let sortedKeys = Object.keys(obj).sort();
    let sortedObj = {};

    for(let key of sortedKeys) {
        sortedObj[key] = sortObject(obj[key]);
    }
    
    return sortedObj;
}
