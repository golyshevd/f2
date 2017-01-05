/*eslint max-nested-callbacks: 0*/
/*global describe, it*/
'use strict';

var assert = require('assert');
var util = require('util');

var u = void 0;
describe('f2', function () {
    var F2 = require('../f2');

    describe('%s', function () {
        var s = require('../types/s');

        it('Should format value as string', function () {
            assert.strictEqual(s('foo', {sign: u, fill: ' ', width: u, precision: u}), 'foo');
            assert.strictEqual(s({}, {sign: u, fill: ' ', width: u, precision: u}), String({}));
        });

        it('Should support precision', function () {
            assert.strictEqual(s('foobar', {sign: u, fill: ' ', width: u, precision: '3'}), 'foo');
        });

        it('Should support width', function () {
            assert.strictEqual(s('foo', {sign: u, fill: ' ', width: '5', precision: u}), '  foo');
        });

        it('Should support fill', function () {
            assert.strictEqual(s('foo', {sign: u, fill: 'x', width: '5', precision: u}), 'xxfoo');
            assert.strictEqual(s('foo', {sign: u, fill: '0', width: '5', precision: u}), '00foo');
            assert.strictEqual(s('foo', {sign: u, fill: ':', width: '5', precision: u}), '::foo');
        });

        it('Should support "-" sign', function () {
            assert.strictEqual(s('foo', {sign: '-', fill: ' ', width: '5', precision: u}), 'foo  ');
        });

        it('Should support " " fill by default', function () {
            assert.strictEqual(s('foo', {sign: u, fill: u, width: '5', precision: u}), '  foo');
        });
    });

    describe('%j', function () {
        var j = require('../types/j');

        it('Should stringify JSON', function () {
            assert.strictEqual(j({}, {sign: u, fill: ' ', width: u, precision: u}), '{}');
        });

        it('Should not fail on circular JSON', function () {
            var o = {};
            o.o = o;
            assert.doesNotThrow(function () {
                j(o, {sign: u, fill: ' ', width: u, precision: u});
            });
        });

        it('Should support sign, width, precision like "s"', function () {
            assert.strictEqual(j({foo: 'bar'}, {sign: '-', fill: ' ', width: '5', precision: '3'}), '{"f  ');
        });
    });

    describe('%d', function () {
        var d = require('../types/d');

        it('Should format as Number', function () {
            assert.strictEqual(d('5', {sign: u, fill: ' ', width: u, precision: u}), '5');
        });

        it('Should add "-" to negative numbers', function () {
            assert.strictEqual(d('-5', {sign: u, fill: ' ', width: u, precision: u}), '-5');
        });

        it('Should support "+" sign', function () {
            assert.strictEqual(d('-5', {sign: '+', fill: ' ', width: u, precision: u}), '-5');
            assert.strictEqual(d('-5', {sign: '-', fill: ' ', width: u, precision: u}), '-5');
            assert.strictEqual(d('5', {sign: '+', fill: ' ', width: u, precision: u}), '+5');
        });

        it('Should support precision', function () {
            assert.strictEqual(d('5', {sign: u, fill: ' ', width: u, precision: '3'}), '005');
        });

        it('Should support "-" sign for width', function () {
            assert.strictEqual(d('5', {sign: '-', fill: ' ', width: '3', precision: u}), '5  ');
        });

        it('Should support fill', function () {
            assert.strictEqual(d('5', {sign: '+', fill: 'x', width: '3', precision: u}), 'x+5');
        });

        it('Should support " " fill by default', function () {
            assert.strictEqual(d('5', {sign: '+', fill: u, width: '3', precision: u}), ' +5');
        });

        it('Should left padded by " " according to width', function () {
            assert.strictEqual(d('5', {sign: u, fill: ' ', width: '3', precision: u}), '  5');
        });

        it('Precision should not be trimmed by width', function () {
            assert.strictEqual(d('5', {sign: u, fill: ' ', width: '3', precision: '5'}), '00005');
        });

        it('Should format objects with valueOf methods returning numbers to numbers', function () {
            assert.strictEqual(d({
                valueOf: function () {
                    return 42;
                }
            }, {sign: u, fill: ' ', width: u, precision: u}), '42');
        });
    });

    describe('f2.format', function () {
        var f2 = require('../bundle');

        it('Should interpret "%%" sequences as "%"', function () {
            assert.strictEqual(f2.format('%%%%'), '%%');
            assert.strictEqual(f2.format('%%%'), '%%');
            assert.strictEqual(f2.format('%%s', 'foo'), '%s "foo"');
            assert.strictEqual(f2.format('%%%s', 'foo'), '%foo');
        });

        it('Should interpret single unmatched "%" as "%"', function () {
            assert.strictEqual(f2.format('%s%', 1), '1%');
            assert.strictEqual(f2.format('%sfoo%', 1), '1foo%');
        });

        it('Should format placeholders according to type', function () {
            assert.strictEqual(f2.format('%s, %d, %j, %%s', 'foo', 42, {}), 'foo, 42, {}, %s');
        });

        it('Should support kwargs', function () {
            assert.strictEqual(f2.format('%s, %d, %(foo)s, %%s', 'foo', 42, {foo: 'bar'}), 'foo, 42, bar, %s');
            assert.strictEqual(f2.format('%(data["\\""])s', {data: {'"': 42}}), '42');
        });

        it('Should use the last argument as kwargs', function () {
            assert.strictEqual(f2.format('%s %(foo)s %s', 1, 2, 3, {foo: 'bar'}), '1 bar 2 3');
        });

        it('Should correctly choose kwargs argument', function () {
            assert.strictEqual(f2.format('%y %(foo)s', {foo: 'bar'}), '%y bar');
        });

        it('Should not skip undefined values', function () {
            assert.strictEqual(f2.format('%s, %s, %(foo)s', 'foo', u, {}), 'foo, undefined, undefined');
        });

        it('Should skip unsupported types', function () {
            assert.strictEqual(f2.format('%s%h', 1), '1%h');
        });

        it('Should inspect extra args', function () {
            assert.strictEqual(f2.format('%s', 'foo', 'bar'), 'foo "bar"');
            assert.strictEqual(f2.format('%s', 'foo', 1, 2), 'foo 1 2');
            assert.strictEqual(f2.format('%s %s', 1, 2, 3, 4), '1 2 3 4');
            assert.strictEqual(f2.format('%s', 'x', 1, 2), 'x 1 2');
            assert.strictEqual(f2.format('%y %s', 'foo', 'bar'), '%y foo "bar"');
            assert.strictEqual(f2.format('%s', 'foo', {}), 'foo {}');
            assert.strictEqual(f2.format({}, 'foo', {}), '{} "foo" {}');
        });

        it('Should do nothing if no arguments passed', function () {
            assert.strictEqual(f2.format(), '');
        });

        it('Should not inspect kwargs', function () {
            assert.strictEqual(f2.format('%s %(foo)s', 12, {foo: 'foo'}), '12 foo');
        });

        it('Should not fail on undefined kwargs', function () {
            assert.strictEqual(f2.format('%s %(foo)s'), 'undefined undefined');
            assert.strictEqual(f2.format('%(foo)s'), 'undefined');
        });

        it('Should support functional args', function () {
            assert.strictEqual(f2.format('%s', function () {
                return 'foo';
            }), 'foo');
        });

        it('Should ignore bad kwarg patterns', function () {
            assert.strictEqual(f2.format('%( %s', 42), '%( 42');
        });

        it('Should support deep kwargs', function () {
            assert.strictEqual(f2.format('Hello, %(who["1"])s!', {
                who: ['nobody', 'golyshevd']
            }), 'Hello, golyshevd!');
            assert.strictEqual(f2.format('Hello, %(["who"]["1"])s!', {
                who: ['nobody', 'golyshevd']
            }), 'Hello, golyshevd!');
        });

        it('Should ignore undefined types', function () {
            assert.strictEqual(f2.format('%y %s', 1), '%y 1');
        });

        it('Should not use kwargs as positional arg', function () {
            assert.strictEqual(f2.format('%(name)s %j', {name: 'Foo'}), 'Foo undefined');
        });

        it('Should not handle first argument if it is not pattern', function () {
            assert.strictEqual(f2.format('', 42), '"" 42');
            assert.strictEqual(f2.format('asd'), '"asd"');
        });

        it('Should ok', function () {
            assert.strictEqual(f2.format('%s %s %(foo)s', 'foo', {foo: 11}), 'foo undefined 11');
        });

        it('Should be ok if too less args passed', function () {
            assert.strictEqual(f2.format('%s %s %s', 'foo'), 'foo undefined undefined');
        });

        it('Should support functions for kwargs', function () {
            assert.strictEqual(f2.format('%(foo)s', {
                foo: function () {
                    return 'bar';
                }
            }), 'bar');
        });

        describe('Support explicit index', function () {
            var _f2 = new F2();

            _f2.type('s', function (v) {
                return String(v);
            });

            it('Should support explicit index links', function () {
                assert.strictEqual(_f2.format('%2$s %1$s', 'a', 'b'), 'b a');
                assert.strictEqual(_f2.format('%2$s %1$s %3$s', 'a', 'b', 'c'), 'b a c');
                assert.strictEqual(_f2.format('%1$s %2$s %3$s', 'a', 'b', 'c'), 'a b c');
                assert.strictEqual(_f2.format('%3$s %2$s %1$s', 'a', 'b', 'c'), 'c b a');
            });

            it('Should support extra args', function () {
                assert.strictEqual(_f2.format('%2$s %1$s', 'a', 'b', 'c'), 'b a "c"');
                assert.strictEqual(_f2.format('%1$s %1$s', 'a', 'b', 'c', 'd'), 'a a "b" "c" "d"');
                assert.strictEqual(_f2.format('%2$s %1$s', 'a', 'b', 'c', 'd'), 'b a "c" "d"');
                assert.strictEqual(_f2.format('%3$s %1$s', 'a', 'b', 'c', 'd'), 'c a "d"');
                assert.strictEqual(_f2.format('%1$s %2$s', 'a', 'b', 'c', 'd'), 'a b "c" "d"');
            });

            it('Should support explicit and implicit indexes', function () {
                assert.strictEqual(_f2.format('%s %1$s %2$s', 'a', 'b'), 'a a b');
                assert.strictEqual(_f2.format('%1$s %s %2$s', 'a', 'b'), 'a a b');
                assert.strictEqual(_f2.format('%1$s %2$s %s', 'a', 'b'), 'a b a');

                assert.strictEqual(_f2.format('%s %1$s %2$s %3$s', 'a', 'b', 'c'), 'a a b c');
                assert.strictEqual(_f2.format('%1$s %s %2$s %3$s', 'a', 'b', 'c'), 'a a b c');
                assert.strictEqual(_f2.format('%1$s %2$s %s %3$s', 'a', 'b', 'c'), 'a b a c');
                assert.strictEqual(_f2.format('%1$s %2$s %3$s %s', 'a', 'b', 'c'), 'a b c a');
            });

            it('Should support explicit and implicit indexes with extra args', function () {
                assert.strictEqual(_f2.format('%s %1$s %2$s', 'a', 'b', 'c', 'd'), 'a a b "c" "d"');
                assert.strictEqual(_f2.format('%1$s %s %2$s', 'a', 'b', 'c', 'd'), 'a a b "c" "d"');
                assert.strictEqual(_f2.format('%1$s %2$s %s', 'a', 'b', 'c', 'd'), 'a b a "c" "d"');

                assert.strictEqual(_f2.format('%s %1$s %2$s %3$s', 'a', 'b', 'c', 'd'), 'a a b c "d"');
                assert.strictEqual(_f2.format('%1$s %s %2$s %3$s', 'a', 'b', 'c', 'd'), 'a a b c "d"');
                assert.strictEqual(_f2.format('%1$s %2$s %s %3$s', 'a', 'b', 'c', 'd'), 'a b a c "d"');
                assert.strictEqual(_f2.format('%1$s %2$s %3$s %s', 'a', 'b', 'c', 'd'), 'a b c a "d"');
            });

            it('Should support explicit indexes and kwargs', function () {
                assert.strictEqual(_f2.format('%1$s %(foo)s', 'a', {foo: 'b'}), 'a b');
                assert.strictEqual(_f2.format('%1$s %(foo)s %2$s', 'a', 'c', {foo: 'b'}), 'a b c');
            });

            it('Should support explicit indexes and kwargs with extra args', function () {
                assert.strictEqual(_f2.format('%1$s %(foo)s', 'a', 'c', {foo: 'b'}), 'a b "c"');
                assert.strictEqual(_f2.format('%1$s %(foo)s %2$s', 'a', 'c', 'd', {foo: 'b'}), 'a b c "d"');
            });

            it('Should support explicit indexes, implicit indexes and kwargs', function () {
                assert.strictEqual(_f2.format('%1$s %(foo)s %s', 'a', {foo: 'b'}), 'a b a');
                assert.strictEqual(_f2.format('%1$s %(foo)s %2$s %s', 'a', 'c', {foo: 'b'}), 'a b c a');
            });

            it('Should support explicit indexes, implicit indexes and kwargs width extra args', function () {
                assert.strictEqual(_f2.format('%1$s %(foo)s %s', 'a', 'c', {foo: 'b'}), 'a b a "c"');
                assert.strictEqual(_f2.format('%1$s %(foo)s %2$s %s', 'a', 'c', 'd', {foo: 'b'}), 'a b c a "d"');
            });
        });

        it('Should not support sign without width', function () {
            assert.strictEqual(f2.format('%s %-s', 42, 43), '42 %-s 43');
        });
    });

    describe('f2.type', function () {
        it('Should throw an error for malformed names', function () {
            var f2 = new F2();
            assert.throws(function () {
                f2.type('', function () {});
            }, TypeError);
            assert.throws(function () {
                f2.type(1, function () {});
            }, TypeError);
            assert.doesNotThrow(function () {
                f2.type('x', function () {});
            });
        });

        it('Should throw an error for malformed functions', function () {
            var f2 = new F2();
            assert.throws(function () {
                f2.type('x', 1);
            }, TypeError);
            assert.throws(function () {
                f2.type('x', null);
            }, TypeError);
            assert.doesNotThrow(function () {
                f2.type('x', function () {});
            }, TypeError);
        });

        it('Should add new formatter type', function () {
            var f2 = new F2();
            f2.type('q', function (v) {
                return '"' + v + '"';
            });
            assert.strictEqual(f2.format('%q', 'x'), '"x"');
        });

        it('Should reset cache', function () {
            var f2 = new F2();

            f2.type('q', function (v) {
                return '"' + v + '"';
            });

            assert.strictEqual(f2.format('%q %x', 'x'), '"x" %x');

            f2.type('x', function (v) {
                return v + '!';
            });

            assert.strictEqual(f2.format('%q %x', 'x', 'y'), '"x" y!');
        });

        it('Should return self', function () {
            var f2 = new F2();
            assert.strictEqual(f2.type('x', function () {}), f2);
        });
    });

    describe('f2.applyArgs()', function () {
        var f2 = new F2();

        f2.type('s', function (v) {
            return String(v);
        });

        it('Should apply args from ofsL to ofsR', function () {
            assert.strictEqual(f2.applyArgs([null, '%s', 1, 2], 1, 1), '1');
        });

        it('Should apply ofsL and ofsR to 0 by default', function () {
            assert.strictEqual(f2.applyArgs(['%s', 1]), '1');
        });
    });

    describe('f2.applyArgsTo()', function () {
        var f2 = new F2();

        f2.type('s', function (v) {
            return String(v);
        });

        it('Should apply args to pattern from ofsL to ofsR', function () {
            assert.strictEqual(f2.applyArgsTo('%s', [null, 1, 2], 1, 1), '1');
        });

        it('Should apply ofsL and ofsR to 0 by default', function () {
            assert.strictEqual(f2.applyArgsTo('%s', [1]), '1');
        });
    });

    describe('f2.hasSubs()', function () {
        var f2 = require('../bundle');

        it('Should have .hasSubs() method', function () {
            assert.strictEqual(typeof f2.hasSubs, 'function');
        });

        var samples = {
            'foo-bar': false,
            'foo%(bar)s': true,
            'foo%(bar)d': true,
            'foo%(bar)j': true,
            'foo%(bar)z': false,
            'foo%%(bar)s': false,
            'foo%%%(bar)s': true,
            'foo%s': true,
            'foo%d': true,
            'foo%j': true,
            'foo%z': false,
            'foo%%s': false,
            'foo%%%s': true
        };

        Object.keys(samples).forEach(function (s) {
            it(util.format('"%s" should %sbe a pattern', s, samples[s] ? '' : 'not '), function () {
                assert.strictEqual(f2.hasSubs(s), samples[s]);
            });
        });
    });

    describe('f2.hasKeySub()', function () {
        var f2 = require('../bundle');

        it('Should have .hasKeySub() method', function () {
            assert.strictEqual(typeof f2.hasKeySub, 'function');
        });

        var samples = [
            ['%(foo)s', 'foo', true],
            ['%(foo)s', 'bar', false],
            ['%(foo)x', 'foo', false],
            ['%(foo)s', '.foo', true],
            ['%(foo)s', ' .foo ', true],
            ['%(foo)s', ' [ "foo" ] ', true],
            ['%(foo.bar)s', ' [ "foo" ].bar ', true],
            ['%(foo.bar)s', ' foo ', true],
            ['%(a.b.c)s', 'a', true],
            ['%(a.b.c)s', 'a.b', true],
            ['%(a.b.c)s', 'a.b.c', true]
        ];

        samples.forEach(function (s) {
            it(util.format('"%s" should %shave "%s" sub', s[0], s[2] ? '' : 'not ', s[1]), function () {
                assert.strictEqual(f2.hasKeySub(s[0], s[1]), s[2]);
            });
        });
    });

    describe('f2.hasPosSub()', function () {
        var f2 = require('../bundle');

        it('Should have .hasPosSub() method', function () {
            assert.strictEqual(typeof f2.hasPosSub, 'function');
        });

        var samples = [
            ['%s', 1, true],
            ['%s', 2, false],
            ['%s %d', 2, true]
        ];

        samples.forEach(function (s) {
            it(util.format('"%s" should %shave "%s" sub', s[0], s[2] ? '' : 'not ', s[1]), function () {
                assert.strictEqual(f2.hasPosSub(s[0], s[1]), s[2]);
            });
        });
    });
});
