'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCliArgs, resolveHost } = require('../config');

test('defaults to the loopback address', () => {
  const options = parseCliArgs([]);
  assert.equal(options.publicMode, false);
  assert.equal(resolveHost(options, {}), '127.0.0.1');
});

test('--public listens on every IPv4 interface', () => {
  const options = parseCliArgs(['--public']);
  assert.equal(options.publicMode, true);
  assert.equal(resolveHost(options, { AWM_HOST: '127.0.0.2' }), '0.0.0.0');
});

test('AWM_HOST remains available without --public', () => {
  assert.equal(resolveHost(parseCliArgs([]), { AWM_HOST: '192.0.2.10' }), '192.0.2.10');
});

test('unknown arguments fail instead of being silently ignored', () => {
  assert.throws(() => parseCliArgs(['--publik']), /Unknown argument/);
});
