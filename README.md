# event-store

[![Build Status](https://travis-ci.org/cayasso/event-store.png?branch=master)](https://travis-ci.org/cayasso/event-store)
[![NPM version](https://badge.fury.io/js/event-store.png)](http://badge.fury.io/js/event-store)


Event sourcing made easy.

## Instalation

``` bash
$ npm install event-store
```

## Usage

order.js

```js
import { Entity } from 'event-store';

const id = 0;

class Order extends Entity {

  constructor(id) {
    super();
    this.id = id || ++id;
    this.amountDue = 0;
    this.amountPaid = 0;
    this.balance = 0;
  }

  initialize(data) {
    this.amountDue = data.amountDue;
    this.record('initialize', data);
    this.enqueue('initialized', data);
  }

  pay(data) {
    this.amountPaid += data.amountPaid;
    this.record('pay', data);
    this.enqueue('paid', data);
    return this;
  }

  get balance() {
    return this.amountDue - this.amountPaid;
  }
}
```

order-store.js

```js

import { Store } from 'event-store';

class OrderStore extends Store {

  constructor(Order) {
    super(Order);
    this.cache = {};
  }

  // We extend the get method to support
  // getting and storing entities to cache.
  get(id, fn) {

    // Try to get entity from cache
    let order = this.cache[id];
    if (order) return fn(null, order, true);

    // Call our parent get method.
    super.get(id, (err, order) => {
      if (err) return fn(err);
      if (!order) order = new Order(id);

      // store entity in cache and bind events
      this.bind(this.cache[id] = order);
      fn(null, order, false);
    });
  }

  bind(order) {

    order.on('init', data => {
      console.log('order was initialized with amount due', order.amountDue);
    });

    order.on('paid', data => {
      console.log('order was paid', order.amountPaid);
      console.log('order remaining balance is', order.balance);
    });
  }
}
```

index.js

```js
import Order from './order';
import OrderStore from './order-store';

// creating instances
const orderStore = new OrderStore(Order);
const order = new Order('abc123');

// Initialize order
order.initialize({ amountDue: 2500 });

// Pay order
order.pay({ amountPaid: 2000 });

// persist our order entity to the store
orderStore.commit(order, (err, order) => {
  console.log(order.id); //=> abc123
});

// later in your code:
// get order entity by id with events applied
orderStore.get('abc123', (err, order, cached) => {

  console.log('order from cache? ', cached);

  console.log(order.balance); //=> 500

  order.pay({ amountPaid: 500 });

  console.log(order.balance); //=> 0

  // persist change
  orderStore.commit(order, (err, order) => {
    console.log(order.id); //=> abc123

    const snapshot = order.snap();
    console.log(snapshot.balance); //=> 0
  });

});
```

## API

For API usage please check [event-store-entity](https://github.com/cayasso/event-store-entity) and [event-store-mongo](https://github.com/cayasso/event-store-mongo) readme files.

## Run tests

```bash
$ make test
```

## Credits

This library was inspired by the [sourced](https://github.com/mateodelnorte/sourced) project.

## License

(The MIT License)

Copyright (c) 2016 Jonathan Brumley &lt;cayasso@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
