'use strict';

const processors = require('../processors.js');

module.exports = {
    help: 'Iterate over the JSON input, printing the result of the given format string for each object. Tokens are of the form %property or %{expression}.',
    usageString: '<format>',
    minPositionalArguments: 1,
    maxPositionalArguments: 1,
    options: [
        {
            names: ['header', 'H'],
            helpArg: 'FORMAT',
            help: 'A header to print before the main output; same token syntax as the format string and is evaluated against the data as a whole.',
            type: 'string'
        },
        {
            names: ['footer', 'F'],
            helpArg: 'FORMAT',
            help: 'A footer to print after the main output; same token syntax as the format string and is evaluated against the data as a whole.',
            type: 'string'
        },
        {
            names: ['no-newline', 'n'],
            type: 'bool',
            help: 'Do not print trailing newline characters after every line.'
        }
    ],
    outputsObject: false,
    hasSmartOutput: true,  // format doesn't spit out JSON, but we do want its output to be subject to autopaging
    needsSandbox: true,
    hasWithClauseOpt: true,
    handler: formatCommandHandler
};

function replacerFactory(runtimeSettings, data)
{
    return (match, unbracketed, bracketed) => {
        // Short-circuit this case; this can only be a property name
        // of the object
        if(unbracketed)
            return data[unbracketed];

        let evaluator = processors.sandboxEvaluatorFactory(bracketed, runtimeSettings);
        let res = evaluator(data);

        if(res === null) return 'null';
        if(res === undefined) return 'undefined';
        return res.toString();
    };
}

function prepareFormatString(format)
{
    // Thanks, JS, for not having lookbehinds in your regexes.
    return format.replace(/(\\)?\\n/gm, (match, escape) => escape ? '\\n' : '\n')
                 .replace(/(\\)?\\t/gm, (match, escape) => escape ? '\\t' : '\t')
                 .replace(/(\\)?\\r/gm, (match, escape) => escape ? '\\r' : '\r');
}

function formatCommandHandler(runtimeSettings, config, opts)
{
    /*
    bracketed: /%\{(?=[^}]*\})([^}]*)\}/
    unbracketed: /%([\w$]+)/
    */

    let format = opts._args[0],
        re = /%([\w%]+)|%\{(?=[^}]*\})([^}]*)\}/gm,
        data = runtimeSettings.sandbox.$$,
        preparedFormatString,
        newline = opts.no_newline ? '' : '\n',
        res = '';
    
    if(opts.header) {
        let replacer = replacerFactory(runtimeSettings, data);
        res += prepareFormatString(opts.header).replace(re, replacer) + newline;
    }

    preparedFormatString = prepareFormatString(format);

    if(Array.isArray(data)) {
        for(let i = 0; i < data.length; i++) {
            let replacer = replacerFactory(runtimeSettings, data[i]);
            res += preparedFormatString.replace(re, replacer) + newline;
        }
    }
    else {
        let replacer = replacerFactory(runtimeSettings, data);
        res += preparedFormatString.replace(re, replacer) + newline;
    }

    if(opts.footer) {
        let replacer = replacerFactory(runtimeSettings, data);
        res += prepareFormatString(opts.footer).replace(re, replacer) + newline;
    }

    return res;
}
