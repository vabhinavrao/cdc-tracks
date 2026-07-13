'use strict';

const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

const PREFIX = config.redis.keyPrefix || 'eds:';

let _client = null;

function _prefixKey(key) {
  return `${PREFIX}${key}`;
}

function getClient() {
  if (_client && _client.status !== 'end') {
    return _client;
  }

  const url = config.redis.url;
  _client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 100, 2000);
    },
  });

  _client.connect().catch((err) => {
    logger.error({ err: err.message }, '[redis] connection failed');
  });

  return _client;
}

async function get(key) {
  const client = getClient();
  return client.get(_prefixKey(key));
}

async function set(key, value, options) {
  const client = getClient();
  const prefixed = _prefixKey(key);
  if (options && options.ttl) {
    return client.set(prefixed, value, 'EX', options.ttl);
  }
  if (options && options.px) {
    return client.set(prefixed, value, 'PX', options.px);
  }
  return client.set(prefixed, value);
}

async function del(key) {
  const client = getClient();
  return client.del(_prefixKey(key));
}

async function exists(key) {
  const client = getClient();
  return client.exists(_prefixKey(key));
}

async function incr(key) {
  const client = getClient();
  return client.incr(_prefixKey(key));
}

async function setNx(key, value, ttlSeconds) {
  const client = getClient();
  const prefixed = _prefixKey(key);
  if (ttlSeconds) {
    const result = await client.set(prefixed, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
  const result = await client.set(prefixed, value, 'NX');
  return result === 'OK';
}

async function expire(key, ttlSeconds) {
  const client = getClient();
  return client.expire(_prefixKey(key), ttlSeconds);
}

async function ttl(key) {
  const client = getClient();
  return client.ttl(_prefixKey(key));
}

async function disconnect() {
  if (_client) {
    await _client.quit().catch(() => {});
    _client = null;
  }
}

module.exports = {
  getClient,
  getRedisClient: getClient,
  get,
  set,
  del,
  exists,
  incr,
  setNx,
  expire,
  ttl,
  disconnect,
  PREFIX
};
