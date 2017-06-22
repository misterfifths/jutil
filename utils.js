'use strict';

const fs = require('fs'),
      path = require('path'),
      os = require('os');

module.exports = {
    loadFile,
    loadJSON,
    resolvePath,
    shallowCopy
};

function loadFile(inputFile, failureIsFatal = true)
{
    try {
        return fs.readFileSync(inputFile, { 'encoding': 'utf8' });
    }
    catch(exc) {
        if(failureIsFatal) {
            console.error('Error: Unable to load file "' + inputFile + '": ' + exc);
            process.exit(1);
        }

        throw exc;
    }
}

function loadJSON(inputFile, runtimeSettings, config, failureIsFatal = true)
{
    let input = loadFile(inputFile, failureIsFatal),
        data;

    try {
        data = runtimeSettings.inputParser(config, input);
    }
    catch(exc) {
        /* istanbul ignore else */
        if(failureIsFatal) {
            console.error('Error parsing input: ' + exc + '.\nInput:\n' + input);
            process.exit(1);
        }
        else {
            throw exc;
        }
    }

    if(runtimeSettings.unwrapper)
        data = runtimeSettings.unwrapper(config, data);

    return data;
}

function resolvePath(p)
{
    switch(p.charAt(0)) {
        case '~': return path.join(os.homedir(), p.substr(1));
        case '/': return p;
        default: return path.join(process.cwd(), p);
    }
}

function shallowCopy(source, dest)
{
    Object.keys(source).forEach(key => dest[key] = source[key]);
}
