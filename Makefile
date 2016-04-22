#!/usr/bin/env make
.DEFAULT_GOAL = all

.PHONY: all
all:: test

.PHONY: test
test:: lint
test:: cover

.PHONY: lint
lint:: jscs
lint:: eslint

.PHONY: jscs
jscs: node_modules/**
	@jscs test tools types *.js

.PHONY: eslint
eslint: node_modules/**
	@eslint test tools types *.js

.PHONY: cover
cover: node_modules/**
	@rm -rf coverage
	@mkdir -p coverage
	@istanbul cover node_modules/.bin/_mocha

.PHONY: benchmark
benchmark: node_modules/**
	@./tools/benchmark

node_modules/**: package.json
	@npm install
