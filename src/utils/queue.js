'use strict';

const { Queue, Worker } = require('bullmq');
const redis = require('./redis');
const config = require('../config');

const BULLMQ_PREFIX = config.bullmq.prefix || 'eds';

const QUEUE_NAMES = Object.freeze({
  ATTENDANCE: 'attendance-refresh',
  MARKS: 'marks-refresh',
  SEMESTER: 'semester-refresh',
});

const ALLOWED_QUEUES = new Set(Object.values(QUEUE_NAMES));

function _validateQueueName(name) {
  if (!ALLOWED_QUEUES.has(name)) {
    throw new Error(
      `[queue] Invalid queue name "${name}". Allowed: ${[...ALLOWED_QUEUES].join(', ')}`
    );
  }
}

const _queues = new Map();
const _workers = [];

function _getConnectionOpts() {
  return redis.getClient();
}

function getQueue(name) {
  _validateQueueName(name);
  if (_queues.has(name)) {
    return _queues.get(name);
  }
  const queue = new Queue(name, {
    connection: _getConnectionOpts(),
    prefix: BULLMQ_PREFIX,
  });
  _queues.set(name, queue);
  return queue;
}

function createWorker(name, processor, opts) {
  _validateQueueName(name);
  const worker = new Worker(name, processor, {
    connection: _getConnectionOpts(),
    prefix: BULLMQ_PREFIX,
    ...opts,
  });
  _workers.push(worker);
  return worker;
}

async function closeAll() {
  const closePromises = [];
  for (const [, queue] of _queues) {
    closePromises.push(queue.close().catch(() => {}));
  }
  for (const worker of _workers) {
    closePromises.push(worker.close().catch(() => {}));
  }
  await Promise.all(closePromises);
  _queues.clear();
  _workers.length = 0;
}

module.exports = {
  getQueue,
  createWorker,
  QUEUE_NAMES,
  BULLMQ_PREFIX,
  closeAll,
};
