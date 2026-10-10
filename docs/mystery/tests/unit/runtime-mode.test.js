import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeMode } from '../../js/core/runtime-mode.js';

const expected = {
  development: {
    kind: 'development',
    isLocal: true,
    offlineRequested: false,
    offlineEnabled: false,
    cleanupRequired: true
  },
  offlineTest: {
    kind: 'offline-test',
    isLocal: true,
    offlineRequested: true,
    offlineEnabled: true,
    cleanupRequired: false
  },
  production: {
    kind: 'production',
    isLocal: false,
    offlineRequested: false,
    offlineEnabled: true,
    cleanupRequired: false
  }
};

test('plain local hosts resolve to development mode', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    assert.deepEqual(resolveRuntimeMode({ hostname, search: '' }), expected.development);
  }
});

test('only one exact sw=1 parameter opts a local URL into offline-test', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    assert.deepEqual(resolveRuntimeMode({ hostname, search: '?sw=1' }), expected.offlineTest);
    assert.deepEqual(
      resolveRuntimeMode({ hostname, search: '?profile=q2-arrived&sw=1' }),
      expected.offlineTest
    );
  }

  for (const search of ['?sw', '?sw=', '?sw=0', '?sw=true', '?sw=01', '?sw=1&sw=0']) {
    assert.deepEqual(resolveRuntimeMode({ hostname: 'localhost', search }), expected.development);
  }
});

test('non-local hosts always resolve to production regardless of query', () => {
  for (const search of ['', '?sw=0', '?sw=true', '?sw=1']) {
    assert.deepEqual(
      resolveRuntimeMode({ hostname: 'example.github.io', search }),
      expected.production
    );
  }
});

test('mode results are immutable runtime values', () => {
  assert.equal(Object.isFrozen(resolveRuntimeMode({ hostname: 'localhost', search: '' })), true);
});
