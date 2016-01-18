BABEL = ./node_modules/.bin/babel

all: node

node: lib
	$(BABEL) lib -d node

clean:
	rm -rf node/

test:
	@./node_modules/.bin/mocha \
		--reporter spec \
		--require should \
		--require babel-core/register \
		--recursive \
		test

.PHONY: test clean node
