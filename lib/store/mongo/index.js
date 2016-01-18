'use strict';

/**
 * Module dependencies.
 */

import Snapshot from './snapshot';
import MongoJS from 'mongojs';
import Event from './event';
import dbg from 'debug';

/**
 * Module dependencies.
 */
const debug = dbg('event-store:store:mongo');

/**
 * MongoStore initializer.
 *
 * @param {Repository} rep
 * @param {Object} config
 * @return {Repository}
 * @api public
 */

export default function MongoStore(rep, config = {}) {

  const { name } = rep;
  let { db, mongo, rounds } = config;

  if (!db && !mongo) {
    throw new Error('Missing required MongoStore db instance or mongo connection string.');
  }

  db = db || MongoJS(mongo);
  let eColl = db.collection(`${name}.events`);
  let sColl = db.collection(`${name}.snapshots`);
  let options = { db, rep, rounds };

  db.on('error', (err) => {
    console.error(err);
    debug('database error ocurred %s', err);
    rep.emit('error', err);
  });

  rep.db = db;
  rep.event = new Event({...options, coll: eColl });
  rep.snapshot = new Snapshot({...options, coll: sColl });

  return rep;
}
