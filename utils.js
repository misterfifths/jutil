"use strict";

module.exports = {
    resolvePath,
    shallowCopy
};

function resolvePath(p)
{
    var path = require('path');
    
    switch(p.charAt(0)) {
        case '~': return path.join(process.env.HOME, p.substr(1));
        case '/': return p;
        default: return path.join(process.cwd(), p);
    }
}

function shallowCopy(source, dest)
{
    var keys = Object.keys(source),
        i,
        key;
    
    for(i = 0; i < keys.length; i++) {
        key = keys[i];
        dest[key] = source[key];
    }
}