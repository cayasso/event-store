'use strict';

/**
 * Module dependencies.
 */

import { EntityError } from './errors';
import Emitter from 'eventemitter3';
import dbg from 'debug';
import _ from './mixin';

/**
 * Module variables.
 */

const debug = dbg('event-store:entity');

export default class Entity extends Emitter {

  constructor() {

    super();

    if (this.constructor === Entity) {
      throw new EntityError('Can not instantiate abstract class.');
    }

    _.predefine(this);

    this.version = 0;
    this.revision = 0;
    this.ts = Date.now();
    this.writable('committing', false);
    this.writable('replaying', false);
    this.writable('_events', {});
    this.writable('events', []);
    this.writable('queue', []);
  }

  /**
   * Emit events.
   *
   * @return {Entity} this
   * @api public
   */

  emit() {
    if (!this.replaying) super.emit(...arguments);
    return this;
  }

  /**
   * Apply event to entity.
   *
   * @param {String} cmd
   * @param {Event} e
   * @return {Entity}
   * @api public
   */

  record(cmd, data) {
    if (this.replaying) return this;
    let e = _.makeEvent(this, cmd, data);
    _.applyEvent(this, e, false);
    return this;
  }

  /**
   * Replay a single or multitple events.
   *
   * @param {Event|Array} e
   * @return {Entity} this
   * @api public
   */

  replay(e) {
    if (Array.isArray(e)) _.each(e, this.replay, this);
    else _.applyEvent(this, e, true);
    return this;
  }

  /**
   * Restore to snapshot.
   *
   * @param {Snapshot} snap
   * @return {Entity}
   * @api public
   */

  restore(snap) {
    if (snap) this.merge(snap);
    return this;
  }

  /**
   * Merge data into entity.
   *
   * @param {Object} data
   * @return {Entity}
   * @api public
   */

  merge(data) {
    return _.merge(this, data);
  }

  /**
   * Take a snapshot of this entity.
   *
   * @return {Snapshot}
   * @api private
   */

  snap() {
    this.version = this.revision;
    return Object.freeze(_.clone(this, true));
  }

  /**
   * Add events to queue.
   *
   * @return {Entity} this
   * @api public
   */

  enqueue() {
    if (!this.replaying) this.queue.push(arguments);
    return this;
  }
}
