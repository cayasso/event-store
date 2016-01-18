
'use strict';

/**
 * Module dependencies.
 */

import { omit } from 'lodash';

/**
 * Module variables.
 */

const isArray = Array.isArray;
const noop = () => {};

export default class Event {

  /**
   * Initialize event object.
   *
   * @param {Event} options
   * @return {Event} this
   * @api public
   */

  constructor({ rep, coll } = {}) {
    this.rep = rep;
    this.coll = coll;
    this.error = this.error.bind(this);
    this.coll.ensureIndex({ id: 1, revision: 1 }, this.error);
    this.coll.ensureIndex({ revision: 1 }, this.error);
  }

  /**
   * Handle `snapshot` errors.
   *
   * @param {Errorr} err
   * @api private
   */

  error(err) {
    if (err) this.rep.emit('error', err);
    return err;
  }

  /**
   * Get `event`.
   *
   * @param {Object} query
   * @param {Function} fn
   * @api public
   */

  get(query = {}, fn) {
    this.coll.find(query).sort({ version: 1 }, fn);
  }

  /**
   * Get multiple `event`s.
   *
   * @param {Object} ids
   * @param {Array} snaps
   * @param {Function} fn
   * @api public
   */

  getMulti(ids, snaps, fn) {
    this.coll.find({
      $or: ids.map(id => {
        const snap = snaps.length ? snaps.find(s => s.id === id) : null;
        return snap ? { id, version: { $gt: snap.revision } } : { id };
      })
    }).sort({ id: 1, version: 1 }).toArray(fn);
  }

  /**
   * Commit events from a single entity.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @return {Event} this
   * @api public
   */

  commit(entity, fn = noop) {
    let events = this.normalize(entity.events);
    if (!events.length) return fn();
    this.coll.insert(events, err => {
      if (err) return fn(err);
      entity.events = [];
      fn();
    });
  }

  /**
   * Commit events from multiple entities.
   *
   * @param {Array} entities
   * @param {Function} fn
   * @return {Event} this
   * @api public
   */

  commitMulti(entities, fn = noop) {
    const events = entities.reduce((a, b) => [...a.events, ...b.events]);
    if (!events.length) return fn(null, []);
    this.coll.insert(this.normalize(events), err => {
      if (err) return fn(err);
      entities.forEach(e => e.events = []);
      fn();
    });
  }

  /**
   * Normalize events.
   *
   * @return {Array} events
   * @param {Object} entity
   * @api private
   */

  normalize(events, entity) {
    return events.map(e => omit(e, '_.id'));
  }

}
