'use strict';

const ansiStyles = require('ansi-styles');

const keyValueRE = /^(\s*)(".*")(\s*:\s*)(.+)$/,
      zeroCharCode = '0'.charCodeAt(0),
      nineCharCode = '9'.charCodeAt(0);

function applyStyle(style, s)
{
    return style.open + s + style.close;
}

function colorizeValue(s)
{
    const firstChar = s.charAt(0),
          lastChar = s.charAt(s.length - 1);
    
    let comma = '';
    
    if(lastChar == ',') {
        comma = ',';
        s = s.substr(0, s.length - 1);
    }

    if(firstChar == '[' || firstChar == ']' || firstChar == '{' || firstChar == '}') {
        return s + comma;
    }
    
    if(firstChar == '"') {
        return applyStyle(ansiStyles.yellow, s) + comma;
    }

    if(firstChar == 't' || firstChar == 'f') {
        return applyStyle(ansiStyles.blue, s) + comma;
    }

    if(firstChar == 'n') {
        return applyStyle(ansiStyles.red, s) + comma;
    }

    if(firstChar == '-') {
        return applyStyle(ansiStyles.cyan, s) + comma;
    }

    const firstCharCode = s.charCodeAt(0);
    if(firstCharCode >= zeroCharCode && firstCharCode <= nineCharCode) {
        return applyStyle(ansiStyles.cyan, s) + comma;
    }

    return s + comma;
}

function colorizeKey(k)
{
    return applyStyle(ansiStyles.bold, applyStyle(ansiStyles.magenta, k));
}

function colorize(input)
{
    const lines = input.split('\n');
    let res = '';
    for(let line of lines) {
        const kvMatch = keyValueRE.exec(line);
        if(!kvMatch) {
            res += colorizeValue(line) + '\n';
            continue;
        }

        const prefix = kvMatch[1],
              key = kvMatch[2],
              colon = kvMatch[3],
              value = kvMatch[4];
        
        res += prefix + colorizeKey(key) + colon + colorizeValue(value) + '\n';
    }

    return res;
}

module.exports = colorize;