function $md5(str) {
    var hasher = require('crypto').createHash('md5');
    hasher.update(str, 'utf8');
    return hasher.digest('base64');
}
