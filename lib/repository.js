'use strict';

/**
 * Module dependencies.
 */

import { RepositoryError } from './errors';
import store from './store/mongo/index';
import Emitter from 'eventemitter3';
import EntityBase from './entity';
import dbg from 'debug';
import _ from './mixin';

/**
 * Module variables.
 */

const debug = dbg('event-store:repository');
const noop = function noop() {};

/**
 * Repository class inheriting from Emitter.
 * 
 * @type {Object}
 */

export default class Repository extends Emitter {

  /**
   * Setup `repository` object.
   *
   * @param {object} options
   * @return {Repository} this
   * @api public
   */

  constructor(Entity, options = {}) {
    super();

    if (this.constructor === Repository) {
      throw new RepositoryError('Can not instantiate abstract class.');
    }

    if (!Entity) {
      throw new RepositoryError('Entity class is required.');
    }

    if (!(Entity.prototype instanceof EntityBase)) {
      throw new RepositoryError('Invalid entity instance provided.');
    }

    this.Entity = Entity;
    this.name = Entity.name.toLowerCase();
    this.use(options.store || store, options);
    return this;
  }

  /**
   * Get an entity.
   *
   * @param {String|Number} id
   * @param {Object} options
   * @param {Function} fn
   * @return {Repository} this
   * @api public
   */

  get(id, fn) {
    let query = { id };
    this.snapshot.get(query, (err, snap) => {
      if (err) return fn(err);
      query = snap ? { id: snap.id, revision: { $gt: snap.revision } } : query;
      this.event.get(query, (err, events) => {
        if (err) return fn(err);
        if (!snap && !events.length) return fn(null, null);
        if (snap) delete snap._id;
        entity = this.deserialize(id).restore(snap).replay(events);
        fn(null, entity, true);
      });
    });
  }

  /**
   * Commit `entity` snapshot and events.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @return {Repository} this
   * @api public
   */

  commit(entity, fn = noop) {
    if (!entity || !entity.id) {
      return fn(new RepositoryError('Invalid entity.'));
    }
    this.snapshot.commit(entity, (err) => {
      if (err) return fn(err);
      this.event.commit(entity, (err) => {
        if (err) return fn(err);
        this.emits(entity);
        fn(null, entity);
      });
    });
    return this;
  }

  /**
   * Emit entity queued events.
   *
   * @param {Object} entity
   * @return {Repository} this
   * @api private
   */

  emits(entity) {
    entity.queue.splice(0, Infinity)
    .forEach((args) => {
      entity.emit(...args);
    });
    return this;
  }

  /**
   * Recreate entity.
   *
   * @param {Object} auction
   * @return {Repository} this
   * @api private
   */

  deserialize(id) {
    let entity = new this.Entity;
    entity.id = id;
    return entity;
  }

  /**
   * Method to extend object.
   * 
   * @param {Function} fn
   * @param {Object} options
   * @return {Repository} this
   * @api public
   */

  use(fn, options) {
    fn(this, options);
    return this;
  }

}