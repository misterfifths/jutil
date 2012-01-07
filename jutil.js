#!/usr/bin/env node
;(function() {
"use strict";

// TODO: how to re-use base for modules?

var config = {
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
    
    // Always sort keys in the output. Useful for automated testing or
    // doing diffs against the results.
    alwaysSort: false,
    
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
            if(typeof val == 'object')
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


var fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    defaultConfigProperties = Object.keys(config),
    configPath,
    userConfig,
    sandbox;

var opts = require('nomnom')
    .script('jutil')
    .options({
        script: {
            position: 0,
            help: 'Script to run against the loaded JSON; may also be loaded from a file via the -s option.'
        },
        prettyPrint: {
            abbr: 'p',
            full: 'pretty-print',
            flag: true,
            help: 'Pretty-print the output.'
        },
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
        sort: {
            abbr: 's',
            flag: true,
            help: 'Sort keys in the output.'
        },
        file: {
            abbr: 'f',
            metavar: 'FILE',
            help: 'Load JSON from the given file instead of reading from stdin.',
            type: 'string'
        },
        scriptPath: {
            abbr: 'i',
            full: 'script',
            metavar: 'FILE',
            help: 'Load the script to run from the given file instead of the first positional argument.',
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
        },
        verbose: {
            abbr: 'v',
            flag: true,
            help: 'Be verbose about things (e.g. module loading).'
        }
    }).parse();

configPath = opts.configPath;


//// Load configuration file

if(configPath) {
    try {
        var realConfigPath = resolvePath(configPath),
            configFile = fs.readFileSync(realConfigPath, 'utf8'),
            configSandbox = vm.createContext({
                $config: config,
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
        for(var propName in userConfig) {
            if(userConfig.hasOwnProperty(propName) &&
               defaultConfigProperties.indexOf(propName) == -1)
            {
                config[propName] = userConfig[propName];
            }
        }
    }
    else
        console.warn('Warning: config file must assign to the global "config" var; ignoring the file');
}


//// Merge in command-line options, load files referenced by them

var settings = {};

if(opts.prettyPrint === false) {}  // --no-pretty-print
else if(opts.prettyPrint || config.alwaysPrettyPrint) settings.prettyPrinter = config.prettyPrinter;

if(opts.sort === false) {} // --no-pretty-print
else if(opts.sort || config.alwaysSort) settings.sort = true;

if(opts.autoUnwrap === false) { }  // --no-auto-unwrap
else if(opts.autoUnwrap || config.alwaysAutoUnwrap)
    settings.unwrapper = config.autoUnwrapper;

if(opts.unwrapProperty)
    settings.unwrapper = function(config, obj) { return obj[opts.unwrapProperty]; };

if(opts.moduleDirectories && opts.moduleDirectories[0] === false) // nomnom turns --no-<list option> into [false]
    settings.modulePaths = [];
else if(opts.moduleDirectories) {
    var dirs = opts.moduleDirectories;
    dirs.push.apply(config.moduleDirectories);
    settings.modulePaths = findModules(dirs);
}
else
    settings.modulePaths = findModules(config.moduleDirectories);

if(opts.modulePaths && opts.modulePaths[0] !== false)
    settings.modulePaths.push.apply(settings.modulePaths, opts.modulePaths);

if(opts.file) settings.file = opts.file;
if(opts.verbose) settings.verbose = true;

if(opts.script && opts.scriptPath) {
    console.error('Error: You cannot specify both a script file (-i/--script) and an inline script.');
    process.exit(1);
}
if(opts.script) settings.script = opts.script;
else if(opts.scriptPath) {
    try {
        settings.scriptPath = opts.scriptPath;
        settings.script = fs.readFileSync(opts.scriptPath, 'utf8');
    }
    catch(exc) {
        console.error('Error: Unable to load script file "' + opts.scriptPath + '": ' + exc);
        process.exit(1);
    }
}

if(!opts.file) opts.file = '/dev/stdin';  // TODO: seems hacky
try {
    settings.json = fs.readFileSync(opts.file, 'utf8');
}
catch(exc) {
    console.error('Error: Unable to load JSON file "' + opts.file + '": ' + exc);
    process.exit(1);
}

settings.jsonParser = config.jsonParser;

//console.log(settings);


//// Load modules

sandbox = vm.createContext({
    $config: config,
    console: console,
    out: console.log,
    process: process,
    require: require
});

for(var i = 0; i < settings.modulePaths.length; i++) {
    var modulePath = settings.modulePaths[i];

    try {
        var moduleContents = fs.readFileSync(modulePath, 'utf8');
        vm.runInContext(moduleContents, sandbox, modulePath);
    }
    catch(exc) {
        console.warn('Warning: error loading module "' + modulePath + '": ' + exc);
    }
}


//// Away we go...

try {
    sandbox.$data = settings.jsonParser(config, settings.json);
}
catch(exc) {
    console.error('Error parsing JSON: ' + exc + '.\nInput:\n' + settings.json);
    process.exit(1);
}

if(settings.unwrapper)
    sandbox.$data = settings.unwrapper(config, sandbox.$data);

var res;

if(settings.script) {
    var script = '(function() { with(this) { ' + settings.script + '; } }).apply($data);';
    
    try {
        res = vm.runInContext(script, sandbox, settings.scriptPath);
    }
    catch(exc) {
        console.error('Error running script: ' + exc);
        process.exit(1);
    }
}
else {
    // No script to run; just pass through the input
    res = sandbox.$data;
}

if(res !== undefined) {
    if(settings.sort)
        res = sortObject(res);

    try {
        if(settings.prettyPrinter)
            res = settings.prettyPrinter(config, res);
        else
            res = JSON.stringify(res);
    }
    catch(exc) {
        console.error('Error converting result to JSON: ' + exc);
        process.exit(1);
    }
    
    if(typeof res != 'string') {
        // JSON.stringify will return undefined if the top-level object is
        // a function or an XML object, neither of which should ever happen,
        // so we're just ignoring this for now.
        res = '';
    }
    
    // process.stdout.write seems like the obvious choice here, but
    // it causes an exception if we pipe a big result to something
    // and close the whole shebang before it can finish writing.
    // Should probably file a node bug...
    var buffer = new Buffer(res);
    fs.write(1, buffer, 0, buffer.length);
}


//// Helpers

function resolvePath(p)
{
    switch(p.charAt(0)) {
        case '~': return path.join(process.env.HOME, p.substr(1));
        case '/': return p;
        default: return path.join(process.cwd(), p);
    }
}

function findModules(dirs)
{
    var paths = [],
        moduleDir,
        allFiles,
        i,
        j,
        file;
    
    for(i = 0; i < dirs.length; i++) {
        moduleDir = resolvePath(config.moduleDirectories[i]);
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

})();