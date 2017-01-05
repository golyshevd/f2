'use strict';

const addFillLeft = require('./add-fill-left');
const addFillRight = require('./add-fill-right');

function addFill(str, fill, sign, width) {
    if (sign === '-') {
        return addFillRight(str, fill, width);
    }

    return addFillLeft(str, fill, width);
}

module.exports = (str, fill, sign, width) => {
    if (width) {
        return addFill(str, fill || ' ', sign, width);
    }

    return str;
};
