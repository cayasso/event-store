'use strict';

/**
 * Module dependencies.
 */

import { predefine, applyEvent, makeEvent } from './utils';
import { clone, merge, omit } from 'lodash';
import { EntityError } from './errors';
import Emitter from 'eventemitter3';
import dbg from 'debug';

/**
 * Module variables.
 */

const debug = dbg('event-store:entity');
const isArray = Array.isArray;

export default class Entity extends Emitter {

  /**
   * Entity constructor.
   *
   * @return {Entity} this
   * @api public
   */

  constructor() {
    super();
    if (this.constructor === Entity) {
      throw new EntityError('Can not instantiate abstract class.');
    }
    predefine(this);
    this.version = 0;
    this.revision = 0;
    this.ts = Date.now();
    this.writable('committing', false);
    this.writable('replaying', false);
    this.writable('_events', {});
    this.writable('events', []);
    this.writable('queue', []);
    this.apply = applyEvent(this);
    this.event = makeEvent(this);
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
    this.apply(this.event(cmd, data), false);
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
    isArray(e) ? e.map(this.replay, this) : this.apply(e, true);
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
    return this.merge(omit(snap, '_id'));
  }

  /**
   * Merge data into entity.
   *
   * @param {Object} data
   * @return {Entity}
   * @api public
   */

  merge(data) {
    return merge(this, data);
  }

  /**
   * Take a snapshot of this entity.
   *
   * @return {Snapshot}
   * @api private
   */

  snap() {
    this.version = this.revision;
    return Object.freeze(clone(this, true));
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
