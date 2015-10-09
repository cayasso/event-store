'use strict';

/**
 * Module dependencies.
 */

import Snapshot from './snapshot';
import MongoJS from 'mongojs';
import Event from './event';
import dbg from 'debug';
import _ from 'lodash';

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

  if (!config.db && !config.mongo) {
    throw new Error('Missing required MongoStore db instance or mongo connection string.');
  }

  let name = rep.name;
  let rounds = config.rounds;
  let db = config.db || MongoJS(config.mongo);
  let eColl = db.collection(`${name}.events`);
  let sColl = db.collection(`${name}.snapshots`);
  let options = { db, rep, rounds };

  db.on('error', (err) => {
    console.error(err);
    debug('database error ocurred %s', err);
    rep.emit('error', err);
  });

  rep.event = new Event(_.merge({ coll: eColl }, options));
  rep.snapshot = new Snapshot(_.merge({ coll: sColl }, options));

  return rep;
}