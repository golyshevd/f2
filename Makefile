#!/usr/bin/env make
.DEFAULT_GOAL = all

.PHONY: all
all:: test

.PHONY: test
test:: lint
test:: unit

.PHONY: lint
lint:: eslint

.PHONY: eslint
eslint: node_modules
	@eslint tools types *.js

.PHONY: unit
unit: node_modules
	@rm -rf coverage
	@mkdir -p coverage
	@istanbul cover node_modules/.bin/_mocha

.PHONY: benchmark
benchmark: node_modules
	@./tools/benchmark

node_modules: package.json .npmrc
	@npm install
