#!/usr/bin/env make
.DEFAULT_GOAL = all

.PHONY: all
all:: test

.PHONY: test
test:: lint
test:: cover

.PHONY: lint
lint:: jscs

.PHONY: jscs
jscs:
	@jscs test tools types *.js

.PHONY: cover
cover:
	@rm -rf coverage
	@mkdir -p coverage
	@istanbul cover node_modules/.bin/_mocha

.PHONY: benchmark
benchmark:
	@./tools/benchmark
