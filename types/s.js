'use strict';

var fillLeft = require('./utils/fill-left');
var fillRight = require('./utils/fill-right');

function _s(value, sign, fill, width, precision) {  // eslint-disable-line max-params
    value = String(value);

    if (precision) {
        value = value.substr(0, precision);
    }

    if (!width) {
        return value;
    }

    if (!fill) {
        fill = ' ';
    }

    if (sign === '-') {
        return fillRight(value, fill, width);
    }

    return fillLeft(value, fill, width);
}

module.exports = _s;
