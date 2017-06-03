"use strict";

const processors = require('../processors.js');

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

function getKeyPath(obj, path)
{
    let dotIdx,
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
        arrayMap = obj.map(o => {
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
    let i = 0,
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

function shapeObj(propMappings, obj)
{
    let res = {};

    for(let i = 0; i < propMappings.length; i++) {
        let mapping = propMappings[i];
        let val = getKeyPath(obj, mapping.from);

        if(val)
            setKeyPath(res, mapping.to, val.value);
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

    return shapeObj(propMappings, data);
}
