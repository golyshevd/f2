'use strict';

const formatS = require('./s');
const jsonStr = require('fast-safe-stringify');

function formatJ(value, placeholder) {
    return formatS(jsonStr(value), placeholder);
}

module.exports = formatJ;
