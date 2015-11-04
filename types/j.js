'use strict';

var _s = require('./s');
var jsonStr = require('json-stringify-safe');

function j(v, s, f, w, p) {
    return _s(jsonStr(v), s, f, w, p);
}

module.exports = j;
