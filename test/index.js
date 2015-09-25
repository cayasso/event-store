'use strict';

import should from 'should';
import {Entity, Repository} from '../lib';

const config = {
  mongo: 'mongodb://127.0.0.1:27017/test-event-store'
};

let id = 0;

class TestEntity extends Entity {
  
  constructor() {
    super();
    this.id = ++id;
    this.status = 'created';
  }

  start(data) {
    this.status = 'started';
    this.startedBy = data.agent;
    this.record('start', data);
    this.emit('started');
  }

  end(data) {
    this.status = 'ended';
    this.endedBy = data.agent;
    this.record('end', data);
    this.enqueue('ended');
  }
}

class TestEntityRepository extends Repository {
  constructor(Entity, options) {
    super(Entity, options);
  }
}

describe('evvented', function() {

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

  describe('Repository', () => {

    it('should be a function', () => {
      Repository.should.be.a.Function;
    });

    it('should throw error if trying to instantiate directly', function () {
      (function () {
        new Repository();
      }).should.throw('Can not instantiate abstract class.');
    });

    it('should throw error if missing entity class', function () {
      (function () {
        new TestEntityRepository();
      }).should.throw("Entity class is required.");
    });

    it('should throw error on providing invalid entity instance', function () {
      (function () {
        new TestEntityRepository({});
      }).should.throw('Invalid entity instance provided.');
    });

    it('should throw error if no connection mongodb string or object is provided', function () {
      (function () {
        new TestEntityRepository(TestEntity);
      }).should.throw(/required MongoStore db instance/);
    });

    it('should have required methods', () => {
      let repository = new TestEntityRepository(TestEntity, config);
      repository.set.should.be.a.Function;
      repository.get.should.be.a.Function;
      repository.commit.should.be.a.Function;
    });

  });

});


