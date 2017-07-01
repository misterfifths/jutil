'use strict';

const ansiStyles = require('ansi-styles');

const keyValueRE = /^(\s*)(?:(".*")(: ))?(.*?)(,?)$/,
      zeroCharCode = '0'.charCodeAt(0),
      nineCharCode = '9'.charCodeAt(0);

const stylesByType = {
    str: ansiStyles.yellow,
    bool: ansiStyles.blue,
    null: ansiStyles.red,
    num: ansiStyles.cyan
};

function applyStyle(style, s)
{
    return style.open + s + style.close;
}

function colorizeValue(s)
{
    // This function is fed values as extracted from the regex - no whitespace and
    // no trailing comma. That means there are preciously few options for what we
    // get, and we can judge our response based entirely on the first character.

    const firstChar = s.charAt(0);

    // pass through braces
    if(firstChar == '[' || firstChar == ']' || firstChar == '{' || firstChar == '}') {
        return s;
    }
    
    // quotes mean string
    if(firstChar == '"') {
        return applyStyle(stylesByType.str, s);
    }

    // 't' or 'f' means 'true' or 'false'
    if(firstChar == 't' || firstChar == 'f') {
        return applyStyle(stylesByType.bool, s);
    }

    // a minus means a negative number
    if(firstChar == '-') {
        return applyStyle(stylesByType.num, s);
    }

    // 0-9 means a positive number
    const firstCharCode = firstChar.charCodeAt(0);
    if(firstCharCode >= zeroCharCode && firstCharCode <= nineCharCode) {
        return applyStyle(stylesByType.num, s);
    }

    // 'n' means 'null'
    if(firstChar == 'n') {
        return applyStyle(stylesByType.null, s);
    }

    // This shouldn't happen; the above optiosn are exhaustive if we were
    // given valid prettified JSON.
    return s;
}

function colorizeKey(k)
{
    return applyStyle(ansiStyles.bold, applyStyle(ansiStyles.magenta, k));
}

function colorize(input)
{
    // Ideally this whole thing could be replaced with a call to input.replace
    // with the regex (flagged gm) and an appropriate replacer function, but that
    // was orders of magnitude slower in my testing. So we'll split the input
    // into lines and do it ourself.

    const lines = input.split('\n');

    let res = '',
        newline = '\n';

    for(let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if(i == lines.length - 1) newline = '';

        // This regex should match every line in prettified JSON, extracting
        // a key if one is present, and a value.
        const kvMatch = keyValueRE.exec(line);

        /* istanbul ignore if */
        if(!kvMatch) {
            // Shouldn't happen
            res += line + newline;
            continue;
        }

        const leadingWhitespace = kvMatch[1] || '',
              key = kvMatch[2] || '',
              colon = kvMatch[3] || '',
              value = kvMatch[4],
              comma = kvMatch[5] || '';

        let colorizedKey = key;
        if(key) colorizedKey = colorizeKey(key);
        res += leadingWhitespace +
               colorizedKey +
               colon +
               colorizeValue(value) +
               comma +
               newline;
    }

    return res;
}

module.exports = colorize;
