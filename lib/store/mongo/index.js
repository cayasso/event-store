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
const debug = dbg('evented:store:mongo');

/**
 * MongoStore initializer.
 *
 * @param {Repository} repository
 * @param {Object} config
 * @return {Repository}
 * @api public
 */

export default function MongoStore(repository, config = {}) {

  if (!config.db && !config.mongo) {
    throw new Error('Missing required MongoStore db instance or mongo connection string.');
  }

  let name = repository.name;
  let db = config.db || MongoJS(config.mongo);
  let eColl = db.collection(`${name}.events`);
  let sColl = db.collection(`${name}.snapshots`);
  let options = { db: db, rounds: config.rounds, rep: repository };

  db.on('error', (err) => {
    console.error(err);
    debug('database error ocurred %s', err);
    repository.emit('error', err);
  });

  repository.event = new Event(_.merge({ coll: eColl }, options));
  repository.snapshot = new Snapshot(_.merge({ coll: sColl }, options));

  return repository;
}