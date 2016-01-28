'use strict';

import should from 'should';
import { Entity, Store } from '../lib';

describe('event-store', function() {

  it('should expose store and entity classes', () => {
    Store.should.be.a.Function;
    Entity.should.be.a.Function;
  });

});
