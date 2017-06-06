'use strict';

const objectPath = require('object-path'),
      processors = require('../processors.js');

module.exports = {
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
};

function shapeObj(propMappings, obj)
{
    let res = {};

    for(let mapping of propMappings) {
        let val = objectPath.get(obj, mapping.from);

        if(val !== undefined)
            objectPath.set(res, mapping.to, val);
    }

    return res;
}

function propsCommandHandler(runtimeSettings, config, opts)
{
    let res = [],
        data = runtimeSettings.data,
        propMappings = [];

    for(let i = 0; i < opts.propMappings.length; i++) {
        let s = opts.propMappings[i].split('=');
        let from, to;

        if(s.length == 1 && s[0].length > 0) {
            // A single property name, no equals sign
            // No rename, just a copy
            from = to = s[0];
        }
        else if(s.length == 2 && s[0].length > 0 && s[1].length > 0) {
            // x=y
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
        return data.map(datum => shapeObj(propMappings, datum));

    return shapeObj(propMappings, data);
}
