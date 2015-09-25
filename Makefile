BABEL = ./node_modules/.bin/babel
BROWSERIFY = ./node_modules/.bin/browserify

all: node

node: lib
	@mkdir -p node/
	$(BABEL) lib -d node

dist: lib
	@mkdir -p dist/
	${BROWSERIFY} -t babelify lib/index.js -o dist/timedown.js

clean:
	rm -rf node/

test:
	@./node_modules/.bin/mocha \
		--reporter spec \
		--require should \
		--require babel/register \
		--recursive \
		test

.PHONY: test clean