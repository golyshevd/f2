'use strict';

var util = require('util');

var LRUD = require('lru-dict');
var Obus = require('obus');

// jscs: disable
var LEX =
    /^(?:%(?:(?:\(((?:[^()]+|"[^"]*"|'[^']*')+)\))|([^0]\d*)\$|)([+-])?(?:(?:([\s\S]):)?(\d+))?(?:\.(\d+))?([a-z])|([^%]+)|(%)%?)/;
// jscs: enable

function Item(type, vars) {
    this.type = type;
    this.text = vars[0];
    this.name = vars[1];
    this.indx = vars[2];
    this.sign = vars[3];
    this.fill = vars[4];
    this.leng = vars[5];
    this.prec = vars[6];
    this.kind = vars[7];
}

/**
 * @class F2
 * */
function F2() {

    /**
     * @private
     * @memberOf {F2}
     * @property
     * @type {LRUD}
     * */
    this.__cache = new LRUD(255);

    /**
     * @private
     * @memberOf {F2}
     * @property
     * @type {Object}
     * */
    this.__types = {};
}

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} name
 * @param {Function} func
 *
 * @returns {F2}
 * */
F2.prototype.type = function (name, func) {
    if (typeof name !== 'string' || name.length !== 1) {
        throw new TypeError('type name should be a string character');
    }

    if (typeof func !== 'function') {
        throw new TypeError('type formatter should be a function');
    }

    this.__types[name] = func;
    // reset cache
    this.__cache.length = 0;

    return this;
};

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @returns {String}
 * */
F2.prototype.format = function () {
    // clone arguments to allow V8 optimize the function
    var argc = arguments.length;
    var args = new Array(argc);

    while (argc) {
        argc -= 1;
        args[argc] = arguments[argc];
    }

    return this.__applyArgs(args, 0, 0);
};

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {Array} args
 * @param {Number} [ofsL]
 * @param {Number} [ofsR]
 *
 * @returns {String}
 * */
F2.prototype.applyArgs = function (args, ofsL, ofsR) {
    // to number
    ofsL >>= 0;
    // to number
    ofsR >>= 0;
    return this.__applyArgs(args, ofsL, ofsR);
};

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} tmpl
 * @param {Array} args
 * @param {Number} [ofsL]
 * @param {Number} [ofsR]
 *
 * @returns {String}
 * */
F2.prototype.applyArgsTo = function (tmpl, args, ofsL, ofsR) {
    // to number
    ofsL >>= 0;
    // to number
    ofsR >>= 0;
    return this.__applyArgsTo(tmpl, args, ofsL, ofsR);
};

/**
 * @protected
 * @memberOf {F2}
 * @method
 *
 * @returns {String}
 * */
F2.prototype._inspect = function (v) {
    return util.inspect(v);
};

F2.prototype.__applyArgs = function (args, ofsL, ofsR) {
    if (typeof args[ofsL] === 'string') {
        return this.__applyArgsTo(args[ofsL], args, ofsL + 1, ofsR);
    }

    return this.__rest([], args, ofsL, ofsR);
};

F2.prototype.__applyArgsTo = function (tmpl, args, ofsL, ofsR) {
    var pattern = this.__expandTmpl(tmpl);
    ofsR += Number(pattern.karg);
    return this.__rest([this.__formatBySubs(pattern.subs, args, ofsL, ofsR)], args, ofsL + pattern.next, ofsR);
};

F2.prototype.__expandTmpl = function (tmpl) {
    if (!this.__cache.peek(tmpl)) {
        this.__cache.set(tmpl, this.__createTmpl(tmpl));
    }

    return this.__cache.get(tmpl);
};

F2.prototype.__createTmpl = function (tmpl) {
    var impl = 0;
    var karg = false;
    var leng = 0;
    var next = -1;
    var subs = [];
    var vars = null;

    /*eslint no-cond-assign: 0*/
    while (vars = LEX.exec(tmpl)) {
        tmpl = tmpl.substr(vars[0].length);

        if (!vars[7] || typeof this.__types[vars[7]] !== 'function') {
            vars = [vars[8] || vars[9] || vars[0]];

            if (leng > 0 && subs[leng - 1].type === 'TXT') {
                subs[leng - 1].text += vars[0];
            } else {
                leng = subs.push(new Item('TXT', vars));
            }

            continue;
        }

        if (vars[1]) {
            leng = subs.push(new Item('KEY', vars));
            karg = true;

            continue;
        }

        if (vars[2]) {
            // explicit index
            vars[2] -= 1;
        } else {
            // implicit index
            vars[2] = impl;
            impl += 1;
        }

        next = Math.max(vars[2], next);

        leng = subs.push(new Item('POS', vars));
    }

    next += 1;

    return {
        // next argument link
        next: next,
        // substitutions array
        subs: subs,
        // does template contain %(kwargs)s ?
        karg: karg
    };
};

F2.prototype.__formatBySubs = function (subs, args, ofsL, ofsR) {
    var argc = args.length;
    var item;
    var subc = subs.length;
    var vals = new Array(subc);
    var word;

    while (subc) {
        subc -= 1;
        item = subs[subc];

        if (item.type === 'TXT') {
            vals[subc] = item.text;
            continue;
        }

        if (item.type === 'KEY') {
            word = Obus.get(args[argc - ofsR], item.name);
        } else
        // item.type === 'POS'
        if (item.indx + ofsL < argc - ofsR) {
            word = args[item.indx + ofsL];
        } else {
            word = undefined;
        }

        vals[subc] = this.__formatWord(word, item);
    }

    return vals.join('');
};

F2.prototype.__rest = function (rest, args, ofsL, ofsR) {
    var i = ofsL;
    var l = args.length - ofsR;

    while (i < l) {
        rest.push(this._inspect(args[i]));
        i += 1;
    }

    return rest.join(' ');
};

F2.prototype.__formatWord = function (word, part) {
    if (typeof word === 'function') {
        word = word();
    }

    return this.__types[part.kind](word, part.sign, part.fill, part.leng, part.prec);
};

/**
 * @public
 * @static
 * @memberOf {F2}
 * @method
 *
 * @param {Object} [params]
 *
 * @returns {F2}
 * */
F2.create = function (params) {
    return new this(params);
};

module.exports = F2;
