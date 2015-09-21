'use strict';

/**
 * Module dependencies.
 */

import store from './store/mongo/index';
import Emitter from 'eventemitter3';
import EntityBase from './entity';
import utils from './utils';
import dbg from 'debug';
import _ from 'lodash';

/**
 * Module variables.
 */

const debug = dbg('evented:repository');
const noop = function noop() {};

/**
 * Repository object inheriting from Emitter.
 * 
 * @type {Object}
 */

class Repository extends Emitter {

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
      throw new Error('Can not instantiate abstract class.');
    }

    if (!Entity) {
      throw new Error('Entity class is required.');
    }

    if (!(Entity.prototype instanceof EntityBase)) {
      throw new Error('Invalid entity instance provided.');
    }

    this.commits = {};
    this.Entity = Entity;
    this.cache = new Map();
    this.name = Entity.name.toLowerCase();
    this.use(options.store || store, options);
    this.cache.enabled = _.merge({ enabled: true }, options.cache);
    return this;
  }

  /**
   * Initialize `repository` object.
   *
   * @param {object} options
   * @return {Repository} this
   * @api public
   */

  set(id, options, fn) {

    if ('function' === typeof options) {
      fn = options;
      options = null;
    }

    return this.get(id, options, (err, entity, cached) => {
      if (err) return fn(err);
      if (entity) return fn(null, entity, cached);
      entity = this.deserialize(id).init(options);
      if (this.cache.enabled) this.cache.set(id, entity);
      return fn(null, entity);
    });
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

  get(id, options, fn) {

    let entity = null;
    let query = { id: id };

    if ('function' === typeof options) {
      fn = options;
      options = null;
    }
    
    if ('object' === typeof id) {
      query = id;
    }

    options = options || {};

    if (query.id) options.id = query.id;

    if (this.cache.enabled) {
      entity = this.cache.get(query.id);
      if (entity && false !== options.cached) {
        return fn(null, entity, true);
      }
    }

    id = query.id;

    this.snapshot.get(query, (err, snap) => {
      if (err) return fn(err);
      query = snap ? { id: snap.id, revision: { $gt: snap.revision } } : { id: id };
      this.event.get(query, (err, events) => {
        if (err) return fn(err);
        if (!snap && !events.length) return fn(null, null);
        if (snap) snap._id = undefined;
        entity = this.deserialize(id).restore(snap).replay(events);
        if (this.cache.enabled) this.cache.set(id, entity);
        fn(null, entity, true);
        this.emit('entity', entity);
      });
    });

    return this;
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
      return fn(new Error('Invalid entity'));
    }

    if (entity.committing) {
      return this.commits[entity.id] = arguments;
    }

    entity.committing = true;
    this.snapshot.commit(entity, (err) => {
      if (err) {
        entity.committing = false;
        return fn(err);
      }
      this.event.commit(entity, (err) => {
        entity.committing = false;
        if (this.commits[entity.id]) {
          let args = this.commits[entity.id];
          delete this.commits[entity.id];
          this.commit.apply(this, args);
        }
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
    .forEach((e) => {
      entity.emit(e.cmd, e);
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

/**
 * Export `repository` object.
 *
 * @type {Repository}
 * @api public
 */

module.exports = Repository;
