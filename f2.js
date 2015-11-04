'use strict';

var util = require('util');

var LRUD = require('lru-dict');
var _objGet = require('obus/_get');
var _oParse = require('obus/parse');

// jscs: disable
var LEX =
    /(?:%(?:(?:\(((?:[^()]+|"[^"]*"|'[^']*')+)\))|([^0]\d*)\$|)([+-])?(?:(?:([\s\S]):)?(\d+))?(?:\.(\d+))?([a-z])|([^%]+)|(%)%?)/g;
// jscs: enable

function TmplItem(type, m) {
    this.type = type;
    this.text = m[0];
    this.path = _oParse(m[1]);
    this.index = m[2];
    this.sign = m[3];
    this.fill = m[4];
    this.width = m[5];
    this.precision = m[6];
    this.subType = m[7];
}

/**
 * @class F2
 * */
function F2() {
    this.__cache = new LRUD(255);
    this.__types = {};
}

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
            // text node
            m = [m[8] || m[9] || m[0]];

            if (itemsCount > 0 && tmplItems[itemsCount - 1].type === 'TXT') {
                // merge sibling text nodes
                tmplItems[itemsCount - 1].text += m[0];
            } else {
                itemsCount = tmplItems.push(new TmplItem('TXT', m));
            }

            continue;
        }

        if (m[1]) {
            // kwarg
            itemsCount = tmplItems.push(new TmplItem('KEY', m));
            containsKwargs = true;

            continue;
        }

        // positional arg

        if (m[2]) {
            // explicit index
            m[2] -= 1;
        } else {
            // implicit index
            m[2] = autoIndex;
            autoIndex += 1;
        }

        restArgsIndex = Math.max(m[2], restArgsIndex);

        itemsCount = tmplItems.push(new TmplItem('POS', m));
    }

    restArgsIndex += 1;

    return {
        containsKwargs: containsKwargs,
        items: tmplItems,
        restArgsIndex: restArgsIndex,
    };
};

F2.prototype.__substituteTmplItems = function (tmplItems, args, offsetLeft, offsetRight) {
    var argc = args.length;
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
            subst = _objGet(args[argc - offsetRight], tmplItem.path);
        } else
        // tmplItem.type === 'POS'
        if (tmplItem.index + offsetLeft < argc - offsetRight) {
            subst = args[tmplItem.index + offsetLeft];
        } else {
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
