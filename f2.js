'use strict';

var util = require('util');

var LRUDict = require('lru-dict');
var obusGet = require('obus/_get');
var obusParse = require('obus/parse');

var R_PATH = /(?:\(((?:"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'|[^()]+)+)\))/.source;
var R_SWAP = /([^0]\d*)\$/.source;
var R_SIGN = /([+-])?/.source;
var R_FILL = /(?:([\s\S]):)/.source;
var R_LENG = /(\d+)/.source;
var R_PREC = /(?:\.(\d+))/.source;
var R_TYPE = /([a-z])/.source;
var R_TEXT = /([^%]+)/.source;
var R_PERC = /(%)%?/.source;

var R_LEX = util.format('%(?:%s|%s|)(?:(?:%s)?%s?%s)?%s?%s|%s|%s',
    R_PATH, R_SWAP, R_SIGN, R_FILL, R_LENG, R_PREC, R_TYPE, R_TEXT, R_PERC);

var LEX = new RegExp(R_LEX, 'g');

function TmplItem(type, text, path, index, sign, fill, width, precision, subType) {
    /* eslint max-params: 1 */
    this.type = type;
    this.text = text;
    this.path = path;
    this.index = index;
    this.sign = sign;
    this.fill = fill;
    this.width = width;
    this.precision = precision;
    this.subType = subType;
}

/**
 * @class F2
 * */
function F2() {
    this.__cache = new LRUDict(255);

    this.__types = {};

    /**
     * @public
     * @memberOf {F2}
     * @method
     *
     * @returns {String}
     * */
    this.format = this.__f2();
}

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

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} name
 * @param {Function} formatter
 *
 * @returns {F2}
 * */
F2.prototype.type = function (name, formatter) {
    if (typeof name !== 'string' || name.length !== 1) {
        throw new TypeError('Type name should be a string character');
    }

    if (typeof formatter !== 'function') {
        throw new TypeError('Type formatter should be a function');
    }

    this.__types[name] = formatter;
    // reset cache
    this.__cache.length = 0;

    return this;
};

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {Array} args
 * @param {Number} [offsetLeft]
 * @param {Number} [offsetRight]
 *
 * @returns {String}
 * */
F2.prototype.applyArgs = function (args, offsetLeft, offsetRight) {
    return this.__applyArgs(args, offsetLeft >> 0, offsetRight >> 0);
};

/**
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} f
 * @param {Array} args
 * @param {Number} [offsetLeft]
 * @param {Number} [offsetRight]
 *
 * @returns {String}
 * */
F2.prototype.applyArgsTo = function (f, args, offsetLeft, offsetRight) {
    return this.__applyArgsTo(f, args, offsetLeft >> 0, offsetRight >> 0);
};

/**
 * Check if the passed argument is pattern
 *
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} f
 *
 * @returns {Boolean}
 * */
F2.prototype.isPattern = function (f) {
    var tmpl = this.__pickTmpl(f);
    return (tmpl.containsKwargs | tmpl.restArgsIndex) > 0;
};

/**
 * Check if the passed pattern has key substitution
 *
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} f
 * @param {String} name
 *
 * @returns {Boolean}
 * */
F2.prototype.hasKeySub = function (f, name) {
    var path = obusParse(name);

    return this.__pickTmpl(f).items.some(function (item) {
        return item.type === 'KEY' &&
            path.every(function (node, i) {
                return node === item.path[i];
            });
    });
};

/**
 * Check if the passed pattern has index substitution
 *
 * @public
 * @memberOf {F2}
 * @method
 *
 * @param {String} f
 * @param {Number} name
 *
 * @returns {Boolean}
 * */
F2.prototype.hasPosSub = function (f, name) {
    name -= 1;
    return this.__pickTmpl(f).items.some(function (item) {
        return item.type === 'POS' && item.index === name;
    });
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

F2.prototype.__applyArgs = function (args, offsetLeft, offsetRight) {
    if (typeof args[offsetLeft] === 'string') {
        return this.__applyArgsTo(args[offsetLeft], args, offsetLeft + 1, offsetRight);
    }

    return this.__appendRestArgs([], args, offsetLeft, offsetRight);
};

F2.prototype.__applyArgsTo = function (f, args, offsetLeft, offsetRight) {
    var tmpl = this.__pickTmpl(f);
    offsetRight += Number(tmpl.containsKwargs);

    return this.__appendRestArgs([this.__substituteTmplItems(tmpl.items, args, offsetLeft, offsetRight)],
        args, offsetLeft + tmpl.restArgsIndex, offsetRight);
};

F2.prototype.__pickTmpl = function (f) {
    var tmpl = this.__cache.get(f);

    if (!tmpl) {
        tmpl = this.__parseF(f);
        this.__cache.set(f, tmpl);
    }

    return tmpl;
};

F2.prototype.__parseF = function (f) {
    /*eslint complexity: 0*/
    var autoIndex = 0;
    var containsKwargs = false;
    var itemsCount = 0;
    var m = null;
    var restArgsIndex = -1;
    var tmplItems = [];

    LEX.lastIndex = 0;

    /*eslint no-cond-assign: 0*/
    while (m = LEX.exec(f)) {

        if (!m[7] || typeof this.__types[m[7]] !== 'function') {
            // text node (no type match, or no type formatter)
            if (itemsCount > 0 && tmplItems[itemsCount - 1].type === 'TXT') {
                // merge sibling text nodes
                tmplItems[itemsCount - 1].text += m[8] || m[9] || m[0];
            } else {
                itemsCount = tmplItems.push(new TmplItem('TXT',
                    m[8] || m[9] || m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7]));
            }

            continue;
        }

        if (m[1]) {
            // keyword argument
            itemsCount = tmplItems.push(new TmplItem('KEY',
                m[0], obusParse(m[1]), m[2], m[3], m[3], m[5], m[6], m[7]));
            containsKwargs = true;

            continue;
        }

        // positional arg

        if (m[2]) {
            // explicit index like `%1$s`
            m[2] -= 1;
        } else {
            // implicit index like `%s`
            m[2] = autoIndex;
            autoIndex += 1;
        }

        restArgsIndex = Math.max(m[2], restArgsIndex);

        itemsCount = tmplItems.push(new TmplItem('POS',
            m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7]));
    }

    restArgsIndex += 1;

    return {
        containsKwargs: containsKwargs,
        items: tmplItems,
        restArgsIndex: restArgsIndex
    };
};

F2.prototype.__appendRestArgs = function (parts, args, offsetLeft, offsetRight) {
    var i = offsetLeft;
    var l = args.length - offsetRight;
    var j = parts.length;

    while (i < l) {
        parts[j] = this._inspect(args[i]);
        j += 1;
        i += 1;
    }

    return parts.join(' ');
};

F2.prototype.__substituteTmplItems = function (tmplItems, args, offsetLeft, offsetRight) {
    var argc = args.length - offsetRight;
    var tmplItem;
    var tmplItemsCount = tmplItems.length;
    var chunks = new Array(tmplItemsCount);
    var subst;

    while (tmplItemsCount) {
        tmplItemsCount -= 1;
        tmplItem = tmplItems[tmplItemsCount];

        if (tmplItem.type === 'TXT') {
            chunks[tmplItemsCount] = tmplItem.text;
            continue;
        }

        if (tmplItem.type === 'KEY') {
            subst = obusGet(args[argc], tmplItem.path);
        } else
        // tmplItem.type === 'POS'
        if (tmplItem.index + offsetLeft < argc) {
            // use positional arg if index fit to range
            subst = args[tmplItem.index + offsetLeft];
        } else {
            // index is not fit to range
            subst = undefined;
        }

        chunks[tmplItemsCount] = this.__formatPlaceholder(tmplItem, subst);
    }

    return chunks.join('');
};

F2.prototype.__formatPlaceholder = function (ph, subst) {
    if (typeof subst === 'function') {
        subst = subst();
    }

    return this.__types[ph.subType](subst, ph.sign, ph.fill, ph.width, ph.precision);
};

F2.prototype.__f2 = function () {
    var self = this;

    function format() {
        // clone arguments to allow V8 optimize the function
        var argc = arguments.length;
        var args = new Array(argc);

        while (argc) {
            argc -= 1;
            args[argc] = arguments[argc];
        }

        return self.__applyArgs(args, 0, 0);
    }

    return format;
};

module.exports = F2;
