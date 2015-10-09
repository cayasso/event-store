'use strict';

/**
 * Module dependencies.
 */

import pre from 'predefine';
import _ from 'lodash';

/**
 * Module variables.
 */

const noop = function noop() {};

export default _.mixin({

  /**
   * Set predefine cmdspaces.
   *
   * @param {Object} obj
   * @api private
   */

  predefine(obj) {
    let writable = pre(obj, pre.WRITABLE);
    let readable = pre(obj, pre.READABLE);
    readable('writable', writable);
    readable('readable', readable);
  },

  /**
   * Make an immutable event.
   *
   * @param {Entity} entity
   * @param {String} cmd
   * @param {Object} data
   * @return {Event}
   * @api private
   */

  makeEvent(entity, cmd, data) {
    entity.revision++;
    entity.ts = Date.now();
    return Object.freeze({
      cmd: cmd,
      data: data,
      id: entity.id,
      version: entity.version,
      revision: entity.revision,
      ts: entity.ts
    });
  },

  /**
   * Apply event to an entity.
   *
   * @param {Entity} entity
   * @param {Event} event
   * @param {Boolean} reply
   * @api private
   */

  applyEvent(entity, event, replay) {
    let fn = entity[event.cmd];
    entity.revision = event.revision;
    entity.ts = event.ts;
    if (!replay) return entity.events.push(event);
    if (_.isFunction(fn)) return entity;
    entity.replaying = replay;
    fn.call(entity, event.data, noop);
    entity.replaying = !replay;
  }

});