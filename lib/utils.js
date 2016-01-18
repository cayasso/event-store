'use strict';

/**
 * Module dependencies.
 */

import pre from 'predefine';
import { curry, isFunction } from 'lodash';

/**
 * Module variables.
 */

const noop = () => {};

/**
 * Set predefine cmdspaces.
 *
 * @param {Object} obj
 * @api private
 */
  
export const predefine = (obj) => {
  let writable = pre(obj, pre.WRITABLE);
  let readable = pre(obj, pre.READABLE);
  readable('writable', writable);
  readable('readable', readable);
};

/**
 * Make an immutable event.
 *
 * @param {Entity} entity
 * @param {String} cmd
 * @param {Object} data
 * @return {Event}
 * @api private
 */

export const makeEvent = curry((entity, cmd, data) => {
  entity.revision++;
  entity.ts = Date.now();
  const { id, ts, version, revision } = entity;
  return Object.freeze({ cmd, data, id, ts, version, revision });
});

/**
 * Apply event to an entity.
 *
 * @param {Entity} entity
 * @param {Event} event
 * @param {Boolean} reply
 * @api private
 */

export const applyEvent = curry((entity, event, replay) => {
  let fn = entity[event.cmd];
  entity.revision = event.revision;
  entity.ts = event.ts;
  if (!replay) return entity.events.push(event);
  if (!isFunction(fn)) return entity;
  entity.replaying = replay;
  fn.call(entity, event.data, noop);
  entity.replaying = !replay;
});