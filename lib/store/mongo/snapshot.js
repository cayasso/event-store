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

export default class Snapshot {

  /**
   * Initialize `snapshot` object.
   *
   * @param {Options} options
   * @return {Snapshot} this
   * @api public
   */

  constructor({ rep, coll, rounds } = {}) {
    this.rep = rep;
    this.coll = coll;
    this.rounds = rounds || 10;
    this.error = this.error.bind(this);
    this.coll.ensureIndex({ id: 1, revision: 1 }, this.error);
    this.coll.ensureIndex({ version: 1 }, this.error);
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
   * Get `snapshot`.
   *
   * @param {String|Number} id
   * @param {Function} fn
   * @api public
   */

  get(id, fn) {
    this.coll.find({ id }).limit(-1).sort({ version: -1 }).next(fn);
  }

  /**
   * Get multiple `snapshot`s.
   *
   * @param {Array} ids
   * @param {Function} fn
   * @api public
   */

  getMulti(ids, fn) {
    return this.coll.aggregate(...[
      { $match: { id: { $in: ids } } },
      { $group: { _id: '$id', revision: { $last: '$revision' } } },
      { $project: { _id: 0, id: '$_id.id', revision: 1 }}
    ], (err, pairs) => {
      if (err) return fn(err);
      let query = {};
      if (!pairs.length) return fn(null, [])
      if (1 === pairs.length) query = pairs[0];
      else query.$or = pairs;
      this.coll.find(query).toArray(fn);
    });
  }

  /**
   * Commit a single entity `snapshot`.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @api public
   */

  commit(entity, options, fn = noop) {
    if (options.snap || entity.revision >= entity.version + this.rounds) {
      let snap = entity.snap();
      return this.coll.insert(this.normalize(snap), err => {
        if (err) return fn(err);
        fn(null, entity);
      });
    }
    return fn(null, entity);
  }

  /**
   * Commit multiple entities `snapshot`s.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @api public
   */

  commitMulti(entities, options, fn = noop) {
    const snaps = entities
      .filter(e => options.snap || e.revision >= e.version + this.rounds)
      .map(e => this.normalize(e.snap()));
    if (!snaps.length) return fn(null, snaps);
    return this.coll.insert(snaps, err => {
      if (err) return fn(err);
      fn(null, entities);
    });
  }

  /**
   * Normalize `snapshot`.
   *
   * @param {Object} snap
   * @return {Object} snap
   * @api private
   */

  normalize(snap) {
    return omit(snap, '_id');
  }

}
