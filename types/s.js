'use strict';

const addFill = require('./utils/add-fill');

function addPrecision(str, precision) {
    if (precision) {
        return str.substr(0, precision);
    }

    return str;
}

function formatS(_value, {sign, fill, width, precision}) {
    let value = String(_value);

    value = addPrecision(value, precision);

    return addFill(value, fill, sign, width);
}

module.exports = formatS;
