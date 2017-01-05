'use strict';

function fillLeft(_value, fill, width) {
    let value = _value;

    while (value.length < width) {
        value = fill + value;
    }

    return value;
}

module.exports = fillLeft;
