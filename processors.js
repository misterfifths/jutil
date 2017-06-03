'use strict';

const vm = require('vm');

module.exports = {
    sandboxEvaluatorFactory,
    mapOverInput,
    runPredicate
};

function sandboxEvaluatorFactory(expr, runtimeSettings, needsReturn = true, runInContextOptions = {})
{
    let script = '($ => { ';
    if(runtimeSettings.withClause) script += 'with(($ === null || $ === undefined) ? {} : $) { ';
    if(needsReturn) script += 'return (';
    script += expr;
    if(needsReturn) script += ');';
    if(runtimeSettings.withClause) script += ' }';
    script += ' })';

    return vm.runInContext(script, runtimeSettings.sandbox, runInContextOptions);
}

function mapOverInput(expr, runtimeSettings, handleOne)
{
    let data = runtimeSettings.sandbox.$$,
        evaluator = sandboxEvaluatorFactory(expr, runtimeSettings);

    if(Array.isArray(data)) {
        for(let datum of data) {
            if(!handleOne(datum, evaluator(datum)))
                return;
        }
    }
    else
        handleOne(data, evaluator(data));
}


function runPredicate(runtimeSettings, opts, handleMatch)
{
    // This means of detecting falsiness breaks down for boxed booleans:
    // for instance, !!(new Boolean(false)) is true, which is totally obnoxious.
    // This shouldn't be a problem if people don't use 'this' to refer to the
    // current datum, this sidestepping boxing.
    let expr = '!!(' + opts.predicate + ')';

    mapOverInput(expr, runtimeSettings, (raw, matched) => {
        if(matched)
            return handleMatch(raw);
        
        return true;
    });
}
