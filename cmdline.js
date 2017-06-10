'use strict';

const path = require('path'),
      dashdash = require('dashdash');

module.exports = { parseCommandLine };

const globalOpts = [
    {
        names: ['unwrap-prop', 'u'],
        abbr: 'u',
        helpArg: 'KEY',
        type: 'string',
        help: 'Operate only against the given property of the loaded data.'
    },
    {
        names: ['auto-unwrap', 'a'],
        type: 'bool',
        help: 'Attempt to intelligently extract a useful property of the loaded data to run against. Specify --no-auto-unwrap to turn off auto-unwrapping even if it is enabled in your config file.'
    },
    {
        name: 'no-auto-unwrap',
        hidden: true,
        type: 'bool'
    },
    {
        names: ['config-file', 'c'],
        helpArg: 'FILE',
        help: 'Load the given config file. The default is the JUTIL_CONFIG_PATH environmental variable or ~/.jutil/config. Specify --no-config-file to use the default configuration.',
        type: 'string',
        'default': process.env.JUTIL_CONFIG_PATH || '~/.jutil/config'
    },
    {
        name: 'no-config-file',
        hidden: true,
        type: 'bool'
    },
    {
        names: ['verbose', 'v'],
        type: 'bool',
        help: 'Be verbose about things (e.g. module loading).'
    },
    {
        names: ['help', 'h'],
        type: 'bool',
        help: 'Show this help.'
    }
];

const fileOpts = [
    {
        names: ['file', 'f'],
        helpArg: 'FILE',
        help: 'Load data from the given file instead of reading from stdin.',
        type: 'string'
    }
];

const objectOutputOpts = [
    {
        names: ['pretty-print', 'p'],
        type: 'bool',
        help: 'Pretty-print the output. Specify --no-pretty-print or -P to disable pretty printing even if it is enabled by your config file or smart output.'
    },
    {
        names: ["no-pretty-print", "P"],
        hidden: true,
        type: 'bool'
    },
    {
        names: ['sort-keys', 's'],
        type: 'bool',
        help: 'Sort keys in the output. Specify --no-sort-keys to disable key sorting even if it is enabled in your config file.'
    },
    {
        name: 'no-sort-keys',
        hidden: true,
        type: 'bool'
    }
];

const smartOutputOpts = [
    {
        names: ['disable-smart', 'S'],
        type: 'bool',
        help: 'Don\'t pretty-print or autopage even if stdout is a terminal.'
    },
    {
        // This is for testing purposes where stdout isn't a TTY but we want to do smart stuff anyway
        name: 'force-smart',
        hidden: true,
        type: 'bool'
    }
];

const sandboxOpts = [
    {
        names: ['module-dir', 'M'],
        helpArg: 'DIR',
        type: 'arrayOfString',
        help: 'Add the given directory as a module path. Any .js files in the directory will be loaded before executing. Specify --no-module-dir to disable directory loading even if it is enabled in your config file.'
    },
    {
        name: 'no-module-dir',
        hidden: true,
        type: 'bool'
    },
    {
        names: ['module', 'm'],
        helpArg: 'FILE',
        type: 'arrayOfString',
        help: 'Load the given JavaScript file before executing. You may repeat this option.'
    }
];

const withClauseOpts = [
    {
        names: ['disable-with', 'W'],
        type: 'bool',
        help: 'Don\'t wrap the script to execute in a "with" clause.'
    }
];

function parseCommandLine(commandFactories, runCommand)
{
    let { args, subcommand } = getArgsAndSubcommand(commandFactories),
        commandDesc = commandFactories[subcommand]();

    assembleCommandOptions(commandDesc);

    let minPositionalArguments = commandDesc.minPositionalArguments || 0,
        maxPositionalArguments = commandDesc.maxPositionalArguments || 0;

    // Special case min specified but not max to mean "at least min, but an unlimited max"
    if(minPositionalArguments > 0 && maxPositionalArguments === 0) {
        maxPositionalArguments = Number.MAX_SAFE_INTEGER;
    }

    let parser = dashdash.createParser({ options: commandDesc.options }),
        opts;

    try {
        opts = parser.parse(args, 0);  // 0 is the index in the array at which to start parsing. It defaults to 2, but we already removed stuff at the front.

        if(opts._args.length < minPositionalArguments) {
            throw new Error('Expected at least ' + minPositionalArguments + ' argument(s), but got ' + opts._args.length);
        }
        else if(opts._args.length > maxPositionalArguments) {
            throw new Error('Expected at most ' + maxPositionalArguments + ' argument(s), but got ' + opts._args.length);
        }
    }
    catch(exc) {
        console.error('Error: ' + exc.message + '\n');
        showHelp(subcommand, commandDesc, parser);
        process.exit(1);
    }

    if(opts.help) {
        showHelp(subcommand, commandDesc, parser);
        process.exit(0);
    }

    runCommand(commandDesc, opts);
}

function getArgsAndSubcommand(commandFactories)
{
    let defaultCommand = 'script',
        args = process.argv.slice(2),  // remove 'node' and script name
        scriptName = path.basename(process.argv[1], '.js'),
        firstArg = args[0],
        subcommand;
    
    // If we weren't invoked as 'jutil', we were called 'j<command name>',
    // which we massage into the first argument.
    if(scriptName != 'jutil') {
        subcommand = scriptName.substr(1);
    }
    else if(!firstArg || !commandFactories.hasOwnProperty(firstArg))
    {
        // Otherwise, add in the default command 'script', if appropriate:
        // no first arg -> default
        // first arg is not a command name -> default
        
        subcommand = defaultCommand;
    }
    else {
        subcommand = args.shift();
    }
    
    return { args, subcommand };
}

function assembleCommandOptions(commandDesc)
{
    // Gather all the options for this command into commandDesc.options

    if(commandDesc.options === undefined) {
        commandDesc.options = [];
    }
    else {
        commandDesc.options.unshift({ group: 'Tool Options' });
    }

    commandDesc.options.push({ group: 'General Options' });
    pushAll(globalOpts, commandDesc.options);

    // This one is on by default, so consider omission to be truthy
    if(commandDesc.hasFileOption === undefined || commandDesc.hasFileOption) {
        pushAll(fileOpts, commandDesc.options);
    }

    if(commandDesc.outputsObject || commandDesc.hasSmartOutput) {
        commandDesc.options.push({ group: 'Output Options' });
    }

    if(commandDesc.outputsObject) {
        commandDesc.hasSmartOutput = true;  // outputsObject implies hasSmartOutput
        pushAll(objectOutputOpts, commandDesc.options);
    }

    if(commandDesc.hasSmartOutput) {
        pushAll(smartOutputOpts, commandDesc.options);
    }

    if(commandDesc.needsSandbox || commandDesc.hasWithClauseOpt) {
        commandDesc.options.push({ group: 'Sandbox Options' });
    }

    if(commandDesc.needsSandbox) {
        pushAll(sandboxOpts, commandDesc.options);
    }

    if(commandDesc.hasWithClauseOpt) {
        pushAll(withClauseOpts, commandDesc.options);
    }
}

function showHelp(subcommand, commandDesc, parser)
{
    let width = process.stdout.isTTY ? process.stdout.getWindowSize()[0] : 80,
        optionsHelp = parser.help({ maxCol: width, indent: 2, headingIndent: 0 }),
        helpString = 'Usage: jutil ' + subcommand + ' [options] ' + commandDesc.usageString + '\n\n' + commandDesc.help + '\n\n' + optionsHelp;
    
    process.stderr.write(helpString);
}

function pushAll(values, dest)
{
    dest.push.apply(dest, values);
}