BABEL = ./node_modules/.bin/babel

all: node

node: lib
	@mkdir -p node/
	$(BABEL) lib -d node

clean:
	rm -rf node/

.PHONY: clean