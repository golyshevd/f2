'use strict';

var s = require('./s');
var jsonStringify = require('json-stringify-safe');

function j(value, sign, fill, width, precision) {
    value = jsonStringify(value);
    return s(value, sign, fill, width, precision);
}

module.exports = j;
