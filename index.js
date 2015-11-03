'use strict';

module.exports = require('./f2').create().
    type('s', require('./types/s')).
    type('d', require('./types/d')).
    type('j', require('./types/j'));
