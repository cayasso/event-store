'use strict';

export class BaseError extends Error {
  constructor(message, logger) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    Error.captureStackTrace(this, this.constructor.name);
    if (logger) logger.emit('error', this);
  }
}

export class RepositoryError extends BaseError {
  constructor(message, logger) {
    super(message, logger);
  }
}

export class EntityError extends BaseError {
  constructor(message, logger) {
    super(message, logger);
  }
}