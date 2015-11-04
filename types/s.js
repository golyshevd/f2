'use strict';

var fillLeft = require('./utils/fill-left');
var fillRight = require('./utils/fill-right');

function s(v, s, f, w, p) {
    v = String(v);

    if (p) {
        v = v.substr(0, p);
    }

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

module.exports = s;
