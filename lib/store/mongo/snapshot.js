'use strict';

export default class Snapshot {

  /**
   * Initialize `snapshot` object.
   *
   * @param {Options} options
   * @return {Snapshot} this
   * @api public
   */

  constructor({ rep, coll, rounds=10 } = {}) {
    this.rep = rep;
    this.coll = coll;
    this.rounds = rounds;
    this.error = this.error.bind(this);
    this.coll.ensureIndex({ id: 1, revision: 1 }, this.error);
    this.coll.ensureIndex({ version: 1 }, this.error);
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
   * Get `snapshot`.
   *
   * @param {String|Number} id
   * @param {Function} fn
   * @api public
   */

  get(query, fn) {
    this.coll
      .find(query)
      .limit(-1)
      .sort({ version: -1 })
      .next(fn);
  }

  /**
   * Commit `snapshot`.
   *
   * @param {Entity} entity
   * @param {Function} fn
   * @api public
   */

  commit(entity, fn = noop) {
    if (entity.revision >= entity.version + this.rounds) {
      let snap = entity.snap();
      return this.coll.insert(this.normalize(snap), (err) => {
        if (err) return fn(err);
        fn(null, entity);
      });
    }
    return fn(null, entity);
  }

  /**
   * Normalize `snapshot`.
   *
   * @param {Object} snap
   * @return {Object} snap
   * @api private
   */

  normalize(snap) {
    if (snap && snap._id) delete snap._id;
    return snap;
  }

}
