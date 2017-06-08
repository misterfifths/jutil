'use strict';

const path = require('path'),
      utils = require('./utils.js');

module.exports = { parseCommandLine };

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
        help: 'Load the given config file. The default is the JUTIL_CONFIG_PATH environmental variable or ~/.jutil/config; specify --no-config to use the default configuration.',
        type: 'string',
        'default': process.env.JUTIL_CONFIG_PATH || '~/.jutil/config'
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

function parseCommandLine(commands, runCommand)
{
    let args = process.argv.slice(2),  // remove 'node' and script name
        defaultCommand = 'script',
        scriptName = path.basename(process.argv[1], '.js'),
        firstArg = args[0],
        parser = require('nomnom'),
        shallowCopy = utils.shallowCopy;
    
    // If we weren't invoked as 'jutil', we were called 'j<command name>',
    // which we massage into the first argument.
    if(scriptName != 'jutil')
        args.unshift(scriptName.substr(1));
    else if(!firstArg || !commands.hasOwnProperty(firstArg))
    {
        // Otherwise, add in the default command 'script', if appropriate:
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