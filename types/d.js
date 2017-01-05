'use strict';

const addFillLeft = require('./utils/add-fill-left');
const addFill = require('./utils/add-fill');

function addPrefix(str, value, sign) {
    if (value < 0) {
        // always add '-' on negative numbers
        return '-' + str;
    }

    if (sign === '+') {
        // add '+' if explicitly specified
        return '+' + str;
    }

    return str;
}

function addPrecision(str, precision) {
    if (precision) {
        return addFillLeft(str, '0', precision);
    }

    return str;
}

function formatD(_value, {sign, fill, width, precision}) {
    let value = String(Math.abs(_value));

    value = addPrecision(value, precision);
    value = addPrefix(value, _value, sign);

    return addFill(value, fill, sign, width);
}

module.exports = formatD;
