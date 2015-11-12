'use strict';

var fillLeft = require('./utils/fill-left');
var fillRight = require('./utils/fill-right');

/*eslint-disable complexity*/
function d(v, s, f, w, p) {
    var pfx = '';

    v = Number(v);

    if (v < 0) {
        // always add '-' on negative numbers
        pfx = '-';
    } else if (s === '+') {
        // add '+' if explicitly specified
        pfx = '+';
    }

    v = String(Math.abs(v));

    if (p) {
        v = fillLeft(v, '0', p);
    }

    v = pfx + v;

    if (!w) {
        return v;
    }

    if (!f) {
        f = ' ';
    }

    if (s === '-') {
        return fillRight(v, f, w);
    }

    return fillLeft(v, f, w);
}
/*eslint-enable complexity*/

module.exports = d;
