"use strict";

const vm = require('vm');

module.exports = {
    mapOverInput,
    runPredicate
};


function mapOverInput(expr, runtimeSettings, handleOne)
{
    function applyToValue(valueStr)
    {
        // If the array contains undefined or null, this gets funky.
        // Function.apply() with one of those turns 'this' into the global
        // object, which is not what was intended, certainly. That's
        // why we recommend using $ to access the data, rather than 'this'.
        // Ewwww... also doing function.apply(<primitive>) will cause the
        // primitive to be autoboxed, which may do Bad Things.
        var script = '(function($) { ';
        if(runtimeSettings.withClause) script += 'with(($ === null || $ === undefined) ? {} : $) { ';
        script += 'return (' + expr + ');';
        if(runtimeSettings.withClause) script += ' }';
        script += ' }).call(' + valueStr + ', ' + valueStr + ');';
        
        return vm.runInContext(script, runtimeSettings.sandbox);
    }
    
    let data = runtimeSettings.data;
    
    // TODO: there's probably a better way to do this, all inside the sandbox,
    // rather than a bunch of calls into it. But eh, will it make that much
    // of a difference, speed-wise?
    
    if(Array.isArray(data)) {
        for(let i = 0; i < data.length; i++) {
            if(!handleOne(data[i], applyToValue('$$[' + i + ']')))
                return;
        }
    }
    else
        handleOne(data, applyToValue('$$'));
}


function runPredicate(runtimeSettings, opts, handleMatch)
{
    // This means of detecting falsiness breaks down for boxed booleans:
    // for instance, !!(new Boolean(false)) is true, which is totally obnoxious.
    // This shouldn't be a problem if people don't use 'this' to refer to the
    // current datum, this sidestepping boxing.
    let expr = '!!(' + opts.predicate + ')';
    
    mapOverInput(expr, runtimeSettings, function(raw, matched) {
        if(matched)
            return handleMatch(raw);
        
        return true;
    });
}
