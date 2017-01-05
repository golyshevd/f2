'use strict';

const jsonStr = require('fast-safe-stringify');

const LRUDict = require('lru-dict');
const obusGet = require('obus/_get');
const obusParse = require('obus/parse');

const R_PATH = /(?:\(((?:"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'|[^()]+)+)\))/.source;
const R_SWAP = /([^0]\d*)\$/.source;
const R_SIGN = /([+-])?/.source;
const R_FILL = /(?:([\s\S]):)/.source;
const R_LENG = /(\d+)/.source;
const R_PREC = /(?:\.(\d+))/.source;
const R_TYPE = /([a-z])/.source;
const R_TEXT = /([^%]+)/.source;
const R_PERC = /(%)%?/.source;

const R_LEX = `^%(?:${R_PATH}|${R_SWAP}|)(?:(?:${R_SIGN})?${R_FILL}?${R_LENG})?${R_PREC}?${R_TYPE}|${R_TEXT}|${R_PERC}`;

const LEX = new RegExp(R_LEX, '');

/**
 * @class F2
 * */
class F2 {

    constructor() {
        this.__cache = new LRUDict(255);
        this.__types = Object.create(null);
    }

    /**
     * @param {...*} args Optional pattern and substitution params
     *
     * @returns {String} Format result
     * */
    format(...args) {
        return this.__applyArgs(args, 0, 0);
    }

    /**
     * @param {String} f Pattern
     * @param {...*} args Substitution params
     *
     * @returns {String} Format result
     * */
    subst(f, ...args) {
        return this.__applyArgsTo(this.__pickTmpl(f), args, 0, 0);
    }

    /**
     * Makes format method static
     *
     * @returns {Function} Static format method
     * */
    detach() {
        return (...args) => this.format(...args);
    }

    /**
     * @param {String} name Type name
     * @param {Function} formatter Formatter function
     *
     * @returns {F2} Current instance
     * */
    type(name, formatter) {
        if (typeof name !== 'string' || name.length !== 1) {
            throw new TypeError('Type name should be a string character');
        }

        if (typeof formatter !== 'function') {
            throw new TypeError('Type formatter should be a function');
        }

        this.__types[name] = formatter;
        // reset parser cache coz it depends on types dict
        this.__cache.length = 0;

        return this;
    }

    /**
     * @param {Array} args Optional Pattern and substitution params in array
     * @param {Number} [offsetLeft] Offset from left for substitution params list
     * @param {Number} [offsetRight] Offset from right for substitution params list
     *
     * @returns {String} Format result
     * */
    applyArgs(args, offsetLeft, offsetRight) {
        return this.__applyArgs(args, offsetLeft | 0, offsetRight | 0);
    }

    /**
     * @param {String} f Pattern
     * @param {Array} args Substitution params in array
     * @param {Number} [offsetLeft] Offset from left for substitution params list
     * @param {Number} [offsetRight] Offset from right for substitution params list
     *
     * @returns {String} Format result
     * */
    applyArgsTo(f, args, offsetLeft, offsetRight) {
        return this.__applyArgsTo(this.__pickTmpl(f), args, offsetLeft | 0, offsetRight | 0);
    }

    /**
     * Check if the passed argument has substitutions
     *
     * @param {String} f String form check for substitutions
     *
     * @returns {Boolean} Check result
     * */
    hasSubs(f) {
        const {posArgsCount, kwargsCount} = this.__pickTmpl(f);

        return posArgsCount + kwargsCount > 0;
    }

    /**
     * Check if the passed pattern has key substitution
     *
     * @param {String} f Pattern
     * @param {String} name Name of keyword substitution
     *
     * @returns {Boolean} Check result
     * */
    hasKeySub(f, name) {
        const path = obusParse(name);

        return this.__pickTmpl(f).items.some((item) =>
            item.type === 'KEY' && path.every((node, i) => node === item.path[i]));
    }

    /**
     * Check if the passed pattern has index substitution
     *
     * @param {String} f Pattern
     * @param {Number} index Index of positional parameter
     *
     * @returns {Boolean} Check result
     * */
    hasPosSub(f, index) {
        const name = index - 1;

        return this.__pickTmpl(f).items.some((item) => item.type === 'POS' && item.index === name);
    }

    /**
     * @protected
     *
     * @param {*} v Value for inspection
     *
     * @returns {String} Inspection result
     * */
    _inspect(v) {
        return jsonStr(v);
    }

    __applyArgs(args, offsetLeft, offsetRight) {
        const f = args[offsetLeft];
        const tmpl = this.__pickTmpl(f);
        const {posArgsCount, kwargsCount, escapesCount} = tmpl;

        if (posArgsCount + kwargsCount + escapesCount) {
            return this.__applyArgsTo(tmpl, args, offsetLeft + 1, offsetRight);
        }

        const argsCount = args.length;
        const fromIndex = offsetLeft;
        const lastIndex = argsCount - offsetRight;

        if (argsCount > 0) {
            return this.__appendRestArgs(this._inspect(args[fromIndex]), args, fromIndex + 1, lastIndex);
        }

        return this.__appendRestArgs('', args, fromIndex, lastIndex);
    }

    __applyArgsTo(tmpl, args, offsetLeft, _offsetRight) {
        const {kwargsCount, restArgsIndex, items} = tmpl;
        const offsetRight = _offsetRight + kwargsCount > 0;
        const argsCount = args.length;
        const lastIndex = argsCount - offsetRight;
        const str = this.__reduceItems(items, args, offsetLeft, lastIndex);
        const fromIndex = offsetLeft + restArgsIndex;

        if (fromIndex < lastIndex) {
            return this.__appendRestArgs(str, args, fromIndex, lastIndex);
        }

        return str;
    }

    __reduceItems(items, args, offsetLeft, lastIndex) {
        return items.reduce((str, tmplItem) =>
            str + this.__reduceItem(tmplItem, args, offsetLeft, lastIndex), '');
    }

    __appendRestArgs(_str, args, _fromIndex, lastIndex) {
        let str = _str;
        let fromIndex = _fromIndex;

        while (fromIndex < lastIndex) {
            str = str + ' ' + this._inspect(args[fromIndex]);
            fromIndex = fromIndex + 1;
        }

        return str;
    }

    __pickTmpl(_f) {
        const f = String(_f);

        return this.__getCacheTmpl(f) || this.__setCacheTmpl(f);
    }

    __setCacheTmpl(f) {
        const tmpl = this.__parseF(f);

        this.__cache.set(f, tmpl);

        return tmpl;
    }

    __getCacheTmpl(f) {
        return this.__cache.get(f);
    }

    __parseF(_f) {
        /* eslint complexity: 0 */
        let autoIndex = 0;
        let kwargsCount = 0;
        let posArgsCount = 0;
        let m = null;
        let restArgsIndex = -1;
        let escapesCount = 0;
        let prevItem = {};
        let f = _f;

        const items = [];

        /* eslint no-cond-assign: 0 */
        while (m = LEX.exec(f)) {
            let text = m[0];
            let path = m[1];
            let index = m[2] | 0;
            const sign = m[3] || '';
            const fill = m[4] || '';
            const width = m[5] | 0;
            const precision = m[6] | 0;
            const subType = m[7];

            f = f.substr(m.index + text.length);

            if (!subType || typeof this.__types[subType] !== 'function') {
                const rest = m[8];
                const escape = m[9];

                text = rest || escape || text;

                escapesCount = escapesCount + Boolean(escape);

                // text node (no type match, or no type formatter)
                if (prevItem.type === 'TXT') {
                    // merge sibling text nodes
                    prevItem.text = prevItem.text + text;
                } else {
                    prevItem = {
                        type: 'TXT',
                        text,
                        path: [],
                        index,
                        sign,
                        fill,
                        width,
                        precision,
                        subType: ''
                    };
                    items.push(prevItem);
                }

                continue;
            }

            if (path) {
                // keyword argument
                prevItem = {
                    type: 'KEY',
                    text,
                    path: obusParse(path),
                    index,
                    sign,
                    fill,
                    width,
                    precision: precision,
                    subType
                };
                items.push(prevItem);
                kwargsCount = kwargsCount + 1;

                continue;
            }

            // positional arg
            if (index) {
                // explicit index like `%1$s`
                index = index - 1;
            } else {
                index = autoIndex;
                // implicit index like `%s`
                autoIndex = autoIndex + 1;
            }

            restArgsIndex = Math.max(index, restArgsIndex);
            posArgsCount = posArgsCount + 1;

            prevItem = {
                type: 'POS',
                text,
                path: [],
                index,
                sign,
                fill,
                width,
                precision,
                subType
            };
            items.push(prevItem);
        }

        restArgsIndex = restArgsIndex + 1;

        return {
            items,
            kwargsCount,
            posArgsCount,
            escapesCount,
            restArgsIndex
        };
    }

    __reduceItem(tmplItem, args, offsetLeft, lastIndex) {
        const {type, text, index, path} = tmplItem;

        if (type === 'TXT') {
            return text;
        }

        if (type === 'KEY') {
            return this.__formatSubst(obusGet(args[lastIndex], path), tmplItem);
        }

        // tmplItem.type === 'POS'
        const posIndex = index + offsetLeft;

        if (posIndex < lastIndex) {
            // use positional arg if index fit to range
            return this.__formatSubst(args[posIndex], tmplItem);
        }

        return this.__formatSubst(undefined, tmplItem); // eslint-disable-line no-undefined
    }

    __formatSubst(subst, tmplItem) {
        const formatter = this.__types[tmplItem.subType];

        if (typeof subst === 'function') {
            // TODO make declarative? drop support?
            return formatter(subst(), tmplItem);
        }

        return formatter(subst, tmplItem);
    }

}

module.exports = F2;
