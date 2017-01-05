'use strict';

var _s = require('./s');
var jsonStr = require('fast-safe-stringify');

function j(value, sign, fill, width, precision) {  // eslint-disable-line max-params
    return _s(jsonStr(value), sign, fill, width, precision);
}

module.exports = j;
