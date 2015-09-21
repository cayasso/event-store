
'use strict';


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
    return this;
  }

  /**
   * Handle `snapshot` errors.
   *
   * @param {Errorr} err
   * @api private
   */

  error(err) {
    if (err) this.rep.emit('error', err);
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
   * Commit events.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @return {Event} this
   * @api public
   */

  commit(entity, fn) {
    let events = this.normalize(entity, entity.events);
    if (!events.length) return fn();
    this.coll.insert(events, (err) => {
      if (err) return fn(err);
      entity.events = [];
      fn();
    });
    return this;
  }

  /**
   * Normalize events.
   *
   * @param {Object} entity
   * @return {Array} events
   * @api private
   */

  normalize(entity, events) {
    events.map((e) => { delete e._id; });
    return events;
  }

}
