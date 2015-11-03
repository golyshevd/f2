#f2 [![Build Status](https://travis-ci.org/golyshevd/f2.svg)](https://travis-ci.org/golyshevd/f2)

_fast and powerful string micro templating_

##API

###Common

####`F2 new F2()`

_class_

```js
var F2 = require('f2/f2');
var f2 = new F2();
```

The module provides a complete instance with built-in type formatters. 

```js
var f2 = require('f2');
```

A class reference needed only for advanced usage.

####`String f2.format([String f][, * arg[, * arg...]])`

_method_

Formats pattern with passed arguments

```js
var f2 = require('f2');
f2.format('Lorem %s!', 'ipsum'); // -> 'Lorem ipsum!'
```

Common method. See the full templates features below.

###Advanced & sugar

####`String f2.applyArgs(Array args[, Number offsetL[, Number offsetR]])`

_method_

Do something like `f2.format.apply(f2, ['Lorem %s!', 'ipsum'])`, but supports args array offsets from left and from right.

```js
var f2 = require('f2');
f2.applyArgs(['Lorem %s!', 'ipsum']); // -> 'Lorem ipsum!'
f2.applyArgs(['foobar', 'Lorem %s!', 'ipsum'], 1); // -> 'Lorem ipsum!'
f2.applyArgs(['foobar', 'Lorem %s!', 'ipsum'], 1, 1); // -> 'Lorem undefined!' // oops!
```

####`String f2.applyArgsTo(String f, Array args[, Number offsetL[, Number offsetR]])`

_method_

Like `f2.applyArgs`, but first argument is template

```js
var f2 = require('f2');
f2.applyArgsTo('Lorem %s!', ['ipsum']); // -> 'Lorem ipsum!'
f2.applyArgsTo('Lorem %s!', ['foobar', 'ipsum'], 1); // -> 'Lorem ipsum!'
```

####`F2 f2.type(String type, Function formatter)`

_method_

Adds new substitution type

```js
var F2 = require('f2/f2');
var f2 = new F2();
f2.type('b', function (v) {
    return '[' + v + ']';
});
f2.format('Lorem %b!', 'ipsum'); // -> 'Lorem [ipsum]!'
```

There are available `s`, `d` and `j` formatters in bundled instance

##Features

###Explicit indexes for positional arguments

```js
f2.format('%2$s %1$s', 'foo', 'bar'); // -> 'bar foo'
```

###Keyword arguments

```js
f2.format('Login to %(user.name)s at %(time)s', {user: {name: 'golyshevd'}, time: 'Tommorrow'}); 
// -> Login to golyshevd at Tommorrow
```

###Inspecting extra arguments

```js
f2.format('Lorem %s', 'ipsum', 'dolor'); // -> 'Lorem ipsum \'dolor\''
```

###Functional arguments

```js
f2.format('Lorem %s!', function () {
    return 'ipsum';
}); // -> 'Lorem ipsum!'
```

###Substitution options

Any substitution type can support options that can be passed in template between `%` and `<type>`

```js
f2.format('Lorem %-?:5.3s!', 'ipsum'); // 'Lorem ips??!'
```

There are `fill`, `sign`, `width` and `precision`. Every formatter can interpretate parameters handling in their own way. All parameters are available in substitution formatter function body.

```js
f2.type('b', function (value, fill, sign, width, precision) {
    return value; // Ignore any parameters, why not?
});
```

---------
LICENSE [MIT](LICENCE)
