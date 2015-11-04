/*eslint max-nested-callbacks: 0*/
/*global describe, it*/
'use strict';

var assert = require('assert');
var v = void 0;
describe('f2', function () {
    var F2 = require('../f2');

    describe('%s', function () {
        var s = require('../types/s');

        it('Should format value as string', function () {
            assert.strictEqual(s('foo', v, ' ', v, v), 'foo');
            assert.strictEqual(s({}, v, ' ', v, v), String({}));
        });

        it('Should support precision', function () {
            assert.strictEqual(s('foobar', v, ' ', v, '3'), 'foo');
        });

        it('Should support width', function () {
            assert.strictEqual(s('foo', v, ' ', '5', v), '  foo');
        });

        it('Should support fill', function () {
            assert.strictEqual(s('foo', v, 'x', '5', v), 'xxfoo');
            assert.strictEqual(s('foo', v, '0', '5', v), '00foo');
            assert.strictEqual(s('foo', v, ':', '5', v), '::foo');
        });

        it('Should support "-" sign', function () {
            assert.strictEqual(s('foo', '-', ' ', '5', v), 'foo  ');
        });

        it('Should support " " fill by default', function () {
            assert.strictEqual(s('foo', v, v, '5', v), '  foo');
        });
    });

    describe('%j', function () {
        var j = require('../types/j');

        it('Should stringify JSON', function () {
            assert.strictEqual(j({}, v, ' ', v, v), '{}');
        });

        it('Should not fail on circular JSON', function () {
            var o = {};
            o.o = o;
            assert.doesNotThrow(function () {
                j(o, v, ' ', v, v);
            });
        });

        it('Should support sign, width, precision like "s"', function () {
            assert.strictEqual(j({foo: 'bar'}, '-', ' ', '5', '3'), '{"f  ');
        });
    });

    describe('%d', function () {
        var d = require('../types/d');

        it('Should format as Number', function () {
            assert.strictEqual(d('5', v, ' ', v, v), '5');
        });

        it('Should add "-" to negative numbers', function () {
            assert.strictEqual(d('-5', v, ' ', v, v), '-5');
        });

        it('Should support "+" sign', function () {
            assert.strictEqual(d('-5', '+', ' ', v, v), '-5');
            assert.strictEqual(d('-5', '-', ' ', v, v), '-5');
            assert.strictEqual(d('5', '+', ' ', v, v), '+5');
        });

        it('Should support precision', function () {
            assert.strictEqual(d('5', v, ' ', v, '3'), '005');
        });

        it('Should support "-" sign for width', function () {
            assert.strictEqual(d('5', '-', ' ', '3', v), '5  ');
        });

        it('Should support fill', function () {
            assert.strictEqual(d('5', '+', 'x', '3', v), 'x+5');
        });

        it('Should support " " fill by default', function () {
            assert.strictEqual(d('5', '+', v, '3', v), ' +5');
        });

        it('Should left padded by " " according to width', function () {
            assert.strictEqual(d('5', v, ' ', '3', v), '  5');
        });

        it('Precision should not be trimmed by width', function () {
            assert.strictEqual(d('5', v, ' ', '3', '5'), '00005');
        });
    });

    describe('f2.format', function () {
        var f2 = new F2().
            type('s', require('../types/s')).
            type('d', require('../types/d')).
            type('j', require('../types/j'));

        it('Should interpret "%%" sequences as "%"', function () {
            assert.strictEqual(f2.format('%%%%'), '%%');
        });

        it('Should interpret single unmatched "%" as "%"', function () {
            assert.strictEqual(f2.format('%'), '%');
            assert.strictEqual(f2.format('foo%'), 'foo%');
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
            assert.strictEqual(f2.format('%s, %s, %(foo)s', 'foo', v, {}), 'foo, undefined, undefined');
        });

        it('Should skip unsupported types', function () {
            assert.strictEqual(f2.format('%h'), '%h');
        });

        it('Should inspect extra args', function () {
            assert.strictEqual(f2.format('%s', 'foo', 'bar'), 'foo \'bar\'');
            assert.strictEqual(f2.format('%s', 'foo', 1, 2), 'foo 1 2');
            assert.strictEqual(f2.format('%s %s', 1, 2, 3, 4), '1 2 3 4');
            assert.strictEqual(f2.format('%s', 'x', 1, 2), 'x 1 2');
            assert.strictEqual(f2.format('%y %s', 'foo', 'bar'), '%y foo \'bar\'');
            assert.strictEqual(f2.format('%s', 'foo', {}), 'foo {}');
            assert.strictEqual(f2.format({}, 'foo', {}), '{} \'foo\' {}');
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
            assert.strictEqual(f2.format('Hello, %(who[1])s!', {
                who: ['nobody', 'golyshevd']
            }), 'Hello, golyshevd!');
            assert.strictEqual(f2.format('Hello, %(["who"][1])s!', {
                who: ['nobody', 'golyshevd']
            }), 'Hello, golyshevd!');
        });

        it('Should ignore undefined types', function () {
            assert.strictEqual(f2.format('%y %s', 1), '%y 1');
        });

        it('Should not use kwargs as positional arg', function () {
            assert.strictEqual(f2.format('%(name)s %j', {name: 'Foo'}), 'Foo undefined');
        });

        it('Should correctly handle empty pattern', function () {
            assert.strictEqual(f2.format('', 42), ' 42');
        });

        it('Should ok', function () {
            assert.strictEqual(f2.format('%s %s %(foo)s', 'foo', {foo: 11}), 'foo undefined 11');
        });

        it('Should be ok if too less args passed', function () {
            assert.strictEqual(f2.format('%s %s %s', 'foo'), 'foo undefined undefined');
        });

        it('Should support functions for kwargs', function () {
            assert.strictEqual(f2.format('%(foo)s', {foo: function () {return 'bar';}}), 'bar');
        });

        describe('Support explicit index', function () {
            var f2 = new F2();

            f2.type('s', function (v) {
                return String(v);
            });

            it('Should support explicit index links', function () {
                assert.strictEqual(f2.format('%2$s %1$s', 'a', 'b'), 'b a');
                assert.strictEqual(f2.format('%2$s %1$s %3$s', 'a', 'b', 'c'), 'b a c');
                assert.strictEqual(f2.format('%1$s %2$s %3$s', 'a', 'b', 'c'), 'a b c');
                assert.strictEqual(f2.format('%3$s %2$s %1$s', 'a', 'b', 'c'), 'c b a');
            });

            it('Should support extra args', function () {
                assert.strictEqual(f2.format('%2$s %1$s', 'a', 'b', 'c'), 'b a \'c\'');
                assert.strictEqual(f2.format('%1$s %1$s', 'a', 'b', 'c', 'd'), 'a a \'b\' \'c\' \'d\'');
                assert.strictEqual(f2.format('%2$s %1$s', 'a', 'b', 'c', 'd'), 'b a \'c\' \'d\'');
                assert.strictEqual(f2.format('%3$s %1$s', 'a', 'b', 'c', 'd'), 'c a \'d\'');
                assert.strictEqual(f2.format('%1$s %2$s', 'a', 'b', 'c', 'd'), 'a b \'c\' \'d\'');
            });

            it('Should support explicit and implicit indexes', function () {
                assert.strictEqual(f2.format('%s %1$s %2$s', 'a', 'b'), 'a a b');
                assert.strictEqual(f2.format('%1$s %s %2$s', 'a', 'b'), 'a a b');
                assert.strictEqual(f2.format('%1$s %2$s %s', 'a', 'b'), 'a b a');

                assert.strictEqual(f2.format('%s %1$s %2$s %3$s', 'a', 'b', 'c'), 'a a b c');
                assert.strictEqual(f2.format('%1$s %s %2$s %3$s', 'a', 'b', 'c'), 'a a b c');
                assert.strictEqual(f2.format('%1$s %2$s %s %3$s', 'a', 'b', 'c'), 'a b a c');
                assert.strictEqual(f2.format('%1$s %2$s %3$s %s', 'a', 'b', 'c'), 'a b c a');
            });

            it('Should support explicit and implicit indexes with extra args', function () {
                assert.strictEqual(f2.format('%s %1$s %2$s', 'a', 'b', 'c', 'd'), 'a a b \'c\' \'d\'');
                assert.strictEqual(f2.format('%1$s %s %2$s', 'a', 'b', 'c', 'd'), 'a a b \'c\' \'d\'');
                assert.strictEqual(f2.format('%1$s %2$s %s', 'a', 'b', 'c', 'd'), 'a b a \'c\' \'d\'');

                assert.strictEqual(f2.format('%s %1$s %2$s %3$s', 'a', 'b', 'c', 'd'), 'a a b c \'d\'');
                assert.strictEqual(f2.format('%1$s %s %2$s %3$s', 'a', 'b', 'c', 'd'), 'a a b c \'d\'');
                assert.strictEqual(f2.format('%1$s %2$s %s %3$s', 'a', 'b', 'c', 'd'), 'a b a c \'d\'');
                assert.strictEqual(f2.format('%1$s %2$s %3$s %s', 'a', 'b', 'c', 'd'), 'a b c a \'d\'');
            });

            it('Should support explicit indexes and kwargs', function () {
                assert.strictEqual(f2.format('%1$s %(foo)s', 'a', {foo: 'b'}), 'a b');
                assert.strictEqual(f2.format('%1$s %(foo)s %2$s', 'a', 'c', {foo: 'b'}), 'a b c');
            });

            it('Should support explicit indexes and kwargs with extra args', function () {
                assert.strictEqual(f2.format('%1$s %(foo)s', 'a', 'c', {foo: 'b'}), 'a b \'c\'');
                assert.strictEqual(f2.format('%1$s %(foo)s %2$s', 'a', 'c', 'd', {foo: 'b'}), 'a b c \'d\'');
            });

            it('Should support explicit indexes, implicit indexes and kwargs', function () {
                assert.strictEqual(f2.format('%1$s %(foo)s %s', 'a', {foo: 'b'}), 'a b a');
                assert.strictEqual(f2.format('%1$s %(foo)s %2$s %s', 'a', 'c', {foo: 'b'}), 'a b c a');
            });

            it('Should support explicit indexes, implicit indexes and kwargs width extra args', function () {
                assert.strictEqual(f2.format('%1$s %(foo)s %s', 'a', 'c', {foo: 'b'}), 'a b a \'c\'');
                assert.strictEqual(f2.format('%1$s %(foo)s %2$s %s', 'a', 'c', 'd', {foo: 'b'}), 'a b c a \'d\'');
            });
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

    describe('F2.create', function () {
        it('Should create {F2}', function () {
            assert.ok(F2.create() instanceof F2);
        });
    });
});
