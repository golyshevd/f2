'use strict';

const F2 = require('./f2');
const s = require('./types/s');
const d = require('./types/d');
const j = require('./types/j');

/**
 * @type {F2}
 * */
module.exports = new F2()
    .type('s', s)
    .type('d', d)
    .type('j', j);
