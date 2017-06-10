#!/usr/bin/env node
"use strict";

const vm = require('vm'),
      fs = require('fs'),
      path = require('path'),
      child_process = require('child_process'),
      objectPath = require('object-path'),
      utils = require('./utils.js'),
      cmdline = require('./cmdline.js');

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
            let value = objectPath.get(obj, propName);
            if(value !== undefined)
                return value;
        }
        
        // No luck; pass through original object
        return obj;
    }
};


// For now (?) we do nothing if imported elsewhere via require
if(require.main != module) {
    return;
}

cmdline.parseCommandLine({
    script: () => require('./subcommands/script.js'),
    where: () => require('./subcommands/where.js'),
    first: () => require('./subcommands/first.js'),
    count: () => require('./subcommands/count.js'),
    select: () => require('./subcommands/select.js'),
    props: () => require('./subcommands/props.js'),
    format: () => require('./subcommands/format.js'),
    sort: () => require('./subcommands/sort.js'),
    cat: () => require('./subcommands/cat.js'),
    take: () => require('./subcommands/take.js'),
    drop: () => require('./subcommands/drop.js'),
    tweak: () => require('./subcommands/tweak.js')
}, runCommand);


//// Guts

function runCommand(commandDesc, opts)
{
    let config = loadConfig(defaultConfig, opts.no_config_file ? undefined : opts.config_file),
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
        if(opts.force_smart) {
            // This is a testing flag. If stdout isn't a TTY, we will fake its getWindowSize()
            settings.smartOutput = true;
            if(!process.stdout.isTTY) {
                process.stdout.getWindowSize = () => [80, 1];
            }
        }
        else if(opts.disable_smart || !process.stdout.isTTY) settings.smartOutput = false;
        else settings.smartOutput = opts.disable_smart === false || !config.disableSmartOutput;
    }

    if(commandDesc.outputsObject) {
        if(opts.no_pretty_print)
            settings.outputFormatter = config.unprettyPrinter;
        else if(opts.pretty_print || config.alwaysPrettyPrint || settings.smartOutput)
            settings.outputFormatter = config.prettyPrinter;
        else
            settings.outputFormatter = config.unprettyPrinter;
    
        if(opts.no_sort_keys) { }
        else if(opts.sort_keys || config.alwaysSortKeys) settings.sortKeys = true;
    }
    
    if(commandDesc.hasWithClauseOpt) {
        if(opts.disable_with) settings.withClause = false;
        else settings.withClause = opts.disable_with === false || !config.disableWithClause;
    }
    
    if(opts.no_auto_unwrap) { }
    else if(opts.auto_unwrap || config.alwaysAutoUnwrap)
        settings.unwrapper = config.autoUnwrapper;
    
    if(opts.unwrap_prop)
        settings.unwrapper = (config, obj) => objectPath.get(obj, opts.unwrap_prop);
    
    settings.verbose = opts.verbose;

    settings.inputParser = config.inputParser;
    
    if(commandDesc.hasFileOption === undefined || commandDesc.hasFileOption) {
        if(opts.file)
            settings.file = opts.file;
        else
            settings.file = '/dev/stdin';

        settings.data = utils.loadJSON(settings.file, settings, config);
    }
    
    // Find modules and load them into a sandbox if the command needs it,
    // and throw the data in there too as $$
    if(commandDesc.needsSandbox) {
        if(opts.no_module_dir)
            settings.modulePaths = [];
        else if(opts.module_dir) {
            let dirs = opts.module_dir;
            dirs.push.apply(dirs, config.moduleDirectories);
            settings.modulePaths = findModules(dirs);
        }
        else
            settings.modulePaths = findModules(config.moduleDirectories);
        
        if(opts.module && opts.module[0] !== false)
            settings.modulePaths.push.apply(settings.modulePaths, opts.module);
    
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
        outputStringWithPaging(str, runtimeSettings, config);
    }
    else {
        dumbOutputString(str, runtimeSettings, config);
    }
}

function outputStringWithPaging(str, runtimeSettings, config)
{
    let pagerCmd = process.env.PAGER || 'less',
        pagerRes = child_process.spawnSync(pagerCmd, {
            input: str,
            encoding: 'utf8',
            shell: true,
            stdio: ['pipe', process.stdout, 'pipe']
        });

    if(pagerRes.error) {
        // We ignore EPIPE; just means that they closed the pager before
        // we finished writing (or the pager never started, in which
        // case the status code check will be sufficient).
        if(pagerRes.error.code != 'EPIPE') {
            console.warn('Warning: error executing pager: ' + pagerRes.error);
            dumbOutputString(str, runtimeSettings, config);
        }
        else if(pagerRes.status == 126 || pagerRes.status == 127) {
            // Shell exit codes for non-executable or nonexistent files
            console.warn('Warning: unable to execute pager');
            dumbOutputString(str, runtimeSettings, config);
        }
        else {
            // Following the lead of git here - for other errors in
            // executing the pager, it just lets the stderr stand
            // for itself and exits with an error code
            process.exit(pagerRes.status || 1);
        }
    }
}

function dumbOutputString(str, runtimeSettings, config)
{
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
