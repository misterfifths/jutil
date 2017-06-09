'use strict';

const objectPath = require('object-path');

module.exports = {
    help: 'Iterate over the input JSON, returning only the given properties of each object. Mappings are of the form [[key.]*key=][key.]*key, to follow subobjects and optionally rename them in the output.',
    usageString: '<mapping...>',
    minPositionalArguments: 1,
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
    let data = runtimeSettings.data,
        propMappings = [];

    for(let propMapping of opts._args) {
        let s = propMapping.split('=');
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
            console.error('Invalid property mapping: ' + propMapping);
            process.exit(1);
        }

        propMappings.push({ from: from, to: to });
    }

    if(Array.isArray(data))
        return data.map(datum => shapeObj(propMappings, datum));

    return shapeObj(propMappings, data);
}
