"use strict";

const processors = require('../processors.js'),
      vm = require('vm');

module.exports = {
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
};

function replacerFactory(runtimeSettings, data, dataString)
{
    return function(match, unbracketed, bracketed) {
        // Short-circuit this case; this can only be a property name
        // of the object
        if(unbracketed)
            return data[unbracketed];

        // Otherwise, evaluate the expression
        // TODO: slight modifications on this are used in a few places;
        // would be good to make this a function.
        let res,
            script;

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

function formatCommandHandler(runtimeSettings, config, opts)
{
    /*
    bracketed: /%\{(?=[^}]*\})([^}]*)\}/
    unbracketed: /%([\w$]+)/
    */

    let format = opts.format,
        re = /%([\w%]+)|%\{(?=[^}]*\})([^}]*)\}/gm,
        data = runtimeSettings.data,
        preparedFormatString,
        newline = opts.noNewline ? '' : '\n',
        res = '';
    
    if(opts.header) {
        let replacer = replacerFactory(runtimeSettings, data, '$$');

        if(opts.header)
            res += prepareFormatString(opts.header).replace(re, replacer) + newline;
    }

    preparedFormatString = prepareFormatString(format);

    if(Array.isArray(data)) {
        for(let i = 0; i < data.length; i++) {
            let replacer = replacerFactory(runtimeSettings, data[i], '$$[' + i + ']');
            res += preparedFormatString.replace(re, replacer) + newline;
        }
    }
    else {
        let replacer = replacerFactory(runtimeSettings, data, '$$');
        res += preparedFormatString.replace(re, replacer) + newline;
    }

    if(opts.footer) {
        let replacer = replacerFactory(runtimeSettings, data, '$$');

        if(opts.footer)
            res += prepareFormatString(opts.footer).replace(re, replacer) + newline;
    }

    return res;
}
