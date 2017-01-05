'use strict';

function fillRight(_value, fill, width) {
    let value = _value;

    while (value.length < width) {
        value = value + fill;
    }

    return value;
}

module.exports = fillRight;
