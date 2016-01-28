'use strict';

import should from 'should';
import MongoJS from 'mongojs';
import { Entity, Store } from '../lib';

const MONGO_URL = 'mongodb://127.0.0.1:27017/test-event-store';
const db = new MongoJS(MONGO_URL);
const config = { db };

let id = 0;

class TestEntity extends Entity {

  constructor(id) {
    super();
    this.id = id || ++id;
    this.status = 'created';
  }

  init() {
    this.status = 'initiated';
    this.record('init');
    return this;
  }

  start(data) {
    this.status = 'started';
    this.startedBy = data.agent;
    this.record('start', data);
    this.emit('started');
    return this;
  }

  end(data) {
    this.status = 'ended';
    this.endedBy = data.agent;
    this.record('end', data);
    this.enqueue('ended');
    return this;
  }
}

class TestEntityStore extends Store {
  constructor(Entity, options) {
    super(Entity, options);
  }
}

describe('event-store', function() {

  describe('Entity', () => {

    it('should be a function', () => {
      Entity.should.be.a.Function;
    });

    it('should throw error if trying to instantiate directly', function () {
      (function () {
        new Entity();
      }).should.throw('Can not instantiate abstract class.');
    });

    it('should have required methods', () => {
      let entity = new TestEntity();
      entity.record.should.be.a.Function;
      entity.restore.should.be.a.Function;
      entity.replay.should.be.a.Function;
      entity.snap.should.be.a.Function;
      entity.enqueue.should.be.a.Function;
    });

    it('should record events', () => {
      let entity = new TestEntity();
      entity.start({ agent: 'jonathan' });
      entity.end({ agent: 'raul' });
      entity.events.length.should.be.eql(2);
      entity.events[0].cmd.should.be.eql('start');
      entity.events[0].should.have.properties(['id', 'ts', 'cmd', 'data', 'version', 'revision']);
      entity.events[0].data.should.have.properties({ agent: 'jonathan' });
      entity.events[1].cmd.should.be.eql('end');
      entity.events[1].should.have.properties(['id', 'ts', 'cmd', 'data', 'version', 'revision']);
      entity.events[1].data.should.have.properties({ agent: 'raul' });
    });

    it('should increment revision when recording events', () => {
      let entity = new TestEntity();
      entity.revision.should.be.eql(0);
      entity.start({ agent: 'jonathan' });
      entity.revision.should.be.eql(1);
      entity.end({ agent: 'raul' });
      entity.revision.should.be.eql(2);
    });

    it('should emit events', (done) => {
      let entity = new TestEntity();
      entity.revision.should.be.eql(0);
      entity.on('started', done);
      entity.start({ agent: 'jonathan' });
    });

    it('should replay a single event', () => {
      let entity = new TestEntity();
      entity.replay({
        "cmd": "start",
        "data": { "agent": "tomas" },
        "id": entity.id,
        "revision": 1,
        "ts": 1442799956314
      });
      entity.status.should.be.eql('started');
      entity.startedBy.should.be.eql('tomas');
      entity.revision.should.be.eql(1);
    });

    it('should replay an array of events', () => {
      let entity = new TestEntity();
      entity.replay([{
        "cmd": "start",
        "data": { "agent": "tomas" },
        "id": entity.id,
        "revision": 1,
        "ts": 1442799956314
      },{
        "cmd": "end",
        "data": { "agent": "mery" },
        "id": entity.id,
        "revision": 2,
        "ts": 1442799956315
      }]);
      entity.status.should.be.eql('ended');
      entity.endedBy.should.be.eql('mery');
      entity.revision.should.be.eql(2);
    });

    it('should not emit events when replaying', () => {
      let entity = new TestEntity();
      entity.on('start', function() {
        throw Error('Should not emit start');
      })
      entity.replay({
        "cmd": "start",
        "data": { "agent": "tomas" },
        "id": entity.id,
        "revision": 1,
        "ts": 1442799956314
      });
    });

    it('should not add replaying events to the array of events', () => {
      let entity = new TestEntity();
      entity.replay({
        "cmd": "start",
        "data": { "agent": "tomas" },
        "id": entity.id,
        "revision": 1,
        "ts": 1442799956314
      });
      entity.events.should.be.empty();
    });

    it('should enqueue events adding them to the queue array', () => {
      let entity = new TestEntity();
      entity.end({ agent: 'jonathan' });
      entity.end({ agent: 'jack' });
      entity.end({ agent: 'jeff' });
      entity.queue.length.should.be.eql(3);
      entity.queue[0][0].should.be.eql('ended');
      entity.queue[1][0].should.be.eql('ended');
      entity.queue[2][0].should.be.eql('ended');
    });

    it('should be able to take snapshots', () => {
      let entity = new TestEntity();
      entity.start({ agent: 'jonathan' });
      entity.end({ agent: 'raul' });
      let snapshot = entity.snap();
      entity.should.have.properties(snapshot);
    });

    it('should be able to restore and entiry from snapshots', () => {
      let entity = new TestEntity();
      let entity2 = new TestEntity();
      entity.start({ agent: 'jonathan' });
      entity.end({ agent: 'raul' });
      let snapshot = entity.snap();
      entity2.restore(snapshot);
      entity.id.should.be.eql(entity2.id);
      entity.version.should.be.eql(2);
      entity.should.have.properties(entity2);
    });

  });

  describe('Store', () => {

    it('should be a function', () => {
      Store.should.be.a.Function;
    });

    it('should throw error if trying to instantiate directly', function () {
      (function () {
        new Store();
      }).should.throw('Can not instantiate abstract class.');
    });

    it('should throw error if missing entity class', function () {
      (function () {
        new TestEntityStore();
      }).should.throw("Entity class is required.");
    });

    it('should throw error on providing invalid entity instance', function () {
      (function () {
        new TestEntityStore({});
      }).should.throw('The given entity is not a constructor.');
    });

    it('should throw error if no mongodb connection string or object is provided', function () {
      (function () {
        new TestEntityStore(TestEntity);
      }).should.throw(/required MongoStore db instance/);
    });

    it('should have required methods', () => {
      let repository = new TestEntityStore(TestEntity, config);
      repository.get.should.be.a.Function;
      repository.commit.should.be.a.Function;
    });

    it('should commit and get single entity', function (done) {
      let repository = new TestEntityStore(TestEntity, config);
      let t1 = new TestEntity('t1').init();
      repository.commit(t1, (err) => {
        if (err) return done(err);
        repository.get('t1', (err, entity) => {
          if (err) return done(err);
          entity.should.be.an.instanceof(Entity);
          t1.id.should.eql(entity.id);
          done();
        });
      });
    })

    it('should commit and get multiple entities', function (done) {
      let repository = new TestEntityStore(TestEntity, config);
      let foo = new TestEntity('foo').init();
      let bar = new TestEntity('bar').init();
      repository.commit([foo, bar], (err, entities) => {
        if (err) return done(err);
        repository.get(['foo', 'bar'], (err, entities) => {
          if (err) return done(err);
          foo.id.should.eql(entities[0].id);
          bar.id.should.eql(entities[1].id);
          done();
        });
      });
    })

    it('should commit and get multiple entities by snapshot', function (done) {
      let repository = new TestEntityStore(TestEntity, config);
      let x = new TestEntity('x').init().start({ agent: 'Martha' });
      let y = new TestEntity('y').init().start({ agent: 'Josh' });
      repository.commit([x, y], { snap: true }, (err, entities) => {
        if (err) return done(err);
        repository.get(['x', 'y'], (err, entities) => {
          if (err) return done(err);
          entities[0].revision.should.eql(2);
          x.id.should.eql(entities[0].id);
          x.startedBy.should.eql(entities[0].startedBy);
          entities[1].revision.should.eql(2);
          y.id.should.eql(entities[1].id);
          y.startedBy.should.eql(entities[1].startedBy);
          done();
        });
      });
    })

  });

  after(function (done) {
    db.dropDatabase(function () {
      db.close(done);
    });
  });

});
