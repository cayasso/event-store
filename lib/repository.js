'use strict';

/**
 * Module dependencies.
 */

import { RepositoryError } from './errors';
import { isFunction, set } from 'lodash';
import store from './store/mongo/index';
import Emitter from 'eventemitter3';
import BaseEntity from './entity';
import dbg from 'debug';

/**
 * Module variables.
 */

const debug = dbg('event-store:repository');
const isArray = Array.isArray;
const noop = () => {};

/**
 * Repository class inheriting from Emitter.
 *
 * @type {Object}
 */

export default class Repository extends Emitter {

  /**
   * Setup `repository` object.
   *
   * @param {Object} Entity
   * @param {Object} options
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

    if (!(Entity.prototype instanceof BaseEntity)) {
      throw new RepositoryError('Invalid entity instance provided.');
    }

    this.Entity = Entity;
    this.name = Entity.name.toLowerCase();
    this.use(options.store || store, options);

    this.invalid = (fn) => fn(new RepositoryError('Invalid entity id property.'));
  }

  /**
   * Get a single or multiple entities.
   *
   * @param {String|Number|Array|Function} id
   * @param {Function} [fnx
   * @return {Repository} this
   * @api public
   */

  get(id, fn) {

    // Get all entities.
    if (isFunction(id)) {
      fn = id;
      this.event.distinct('id', (err, ids) => {
        if (err) return fn(err);
        this.get(ids, fn);
      });
    } else if (isArray(id)) {
      const ids = id;

      // Get multiple entities by ids.
      this.snapshot.getMulti(ids, (err, snaps) => {
        if (err) return fn(err);
        this.event.getMulti(ids, snaps, (err, events) => {
          if (err) return fn(err);
          if (snaps && !snaps.length && !events.length) return fn(null, []);
          const check = id => i => i.id === id;
          const entities = ids
            .map(id => this.cast(id)
              .restore(snaps.find(check(id)))
              .replay(events.filter(check(id))))
          fn(null, entities);
        });
      });

    } else {

      // Get a single entity by id.
      this.snapshot.get(id, (err, snap) => {
        if (err) return fn(err);
        const query = snap ? { id: snap.id, revision: { $gt: snap.revision } } : { id };
        this.event.get(query, (err, events) => {
          if (err) return fn(err);
          if (!snap && !events.length) return fn(null, null);
          let entity = this.cast(id).restore(snap).replay(events);
          fn(null, entity, true);
        });
      });
    }
    return this;
  }

  /**
   * Commit `entity` snapshot and events.
   *
   * @param {Entity|Array} entity
   * @param {Function} [fn]
   * @return {Repository} this
   * @api public
   */

  commit(entity, options, fn = noop) {

    if (isFunction(options)) {
      fn = options;
      options = {};
    }

    if (isArray(entity)) {
      const entities = entity;

      if (entities.find(e => !e.id)) return this.invalid(fn);

      // Commit multiple entities
      this.snapshot.commitMulti(entities, options, (err, docs ) => {
        if (err) return fn(err);
        this.event.commitMulti(entities, (err, docs) => {
          if (err) return fn(err);
          entities.map(this.emits)
          fn(null, entities);
        });
      });

    } else {

      if (!entity || !entity.id) return this.invalid(fn);

      // Commit a single entity
      this.snapshot.commit(entity, options, err => {
        if (err) return fn(err);
        this.event.commit(entity, err => {
          if (err) return fn(err);
          fn(null, this.emits(entity));
        });
      });
    }
    return this;
  }

  /**
   * Emit entity queued events.
   *
   * @param {Entity} entity
   * @return {Repository} this
   * @api private
   */

  emits(entity) {
    entity.queue.splice(0, Infinity)
    .forEach(a => entity.emit(...a));
    return this;
  }

  /**
   * Recreate entity.
   *
   * @param {Object} id
   * @return {Entity}
   * @api private
   */

  cast(id) {
    return set(new this.Entity, 'id', id);
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
