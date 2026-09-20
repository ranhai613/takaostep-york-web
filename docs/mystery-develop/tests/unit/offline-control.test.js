import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupDevelopmentOfflineState } from '../../js/services/offline-control.js';

function memorySession(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('unregisters only the exact app scope and deletes only MIRA caches', async () => {
  const unregistered = [];
  const registrations = [
    { scope: 'http://localhost:4173/', unregister: async () => { unregistered.push('app'); return true; } },
    { scope: 'http://localhost:4173/other/', unregister: async () => { unregistered.push('other'); return true; } }
  ];
  const deleted = [];
  const sessionStore = memorySession();
  let reloads = 0;
  const playerState = '{"chapterId":"chapter-2"}';
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error(`PlayerState must not be read: ${playerState}`); }
  });

  try {
    const result = await cleanupDevelopmentOfflineState({
      serviceWorker: { getRegistrations: async () => registrations, controller: {} },
      cacheStorage: {
        keys: async () => ['mira-signal-old', 'mira-signal-current', 'other-app-cache'],
        delete: async name => { deleted.push(name); return true; }
      },
      appScope: 'http://localhost:4173/',
      sessionStore,
      reload: () => { reloads += 1; }
    });

    assert.deepEqual(unregistered, ['app']);
    assert.deepEqual(deleted, ['mira-signal-old', 'mira-signal-current']);
    assert.deepEqual(result.deletedCacheNames, deleted);
    assert.equal(result.registrationFound, true);
    assert.equal(result.unregistered, true);
    assert.equal(result.controllerStillActive, true);
    assert.equal(result.reloadRequired, true);
    assert.equal(result.reloadTriggered, true);
    assert.equal(reloads, 1);
    assert.deepEqual(result.errors, []);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    else delete globalThis.localStorage;
  }
});

test('does not reload twice in one tab session', async () => {
  let reloads = 0;
  const result = await cleanupDevelopmentOfflineState({
    serviceWorker: {
      getRegistrations: async () => [{ scope: 'http://localhost:4173/', unregister: async () => true }],
      controller: {}
    },
    cacheStorage: { keys: async () => [], delete: async () => true },
    appScope: 'http://localhost:4173/',
    sessionStore: memorySession({ 'mira-development-cleanup-reload': '1' }),
    reload: () => { reloads += 1; }
  });

  assert.equal(result.reloadTriggered, false);
  assert.equal(reloads, 0);
  assert.equal(result.errors.some(error => error.code === 'reload-loop'), true);
});

test('does not reload without a session guard', async () => {
  let reloads = 0;
  const result = await cleanupDevelopmentOfflineState({
    serviceWorker: {
      getRegistrations: async () => [{ scope: 'http://localhost:4173/', unregister: async () => true }],
      controller: {}
    },
    cacheStorage: { keys: async () => [], delete: async () => true },
    appScope: 'http://localhost:4173/',
    sessionStore: undefined,
    reload: () => { reloads += 1; }
  });

  assert.equal(result.reloadTriggered, false);
  assert.equal(reloads, 0);
  assert.equal(result.errors.some(error => error.code === 'reload-guard-unavailable'), true);
});

test('reports retryable cleanup failures and does not reload', async () => {
  let reloads = 0;
  const result = await cleanupDevelopmentOfflineState({
    serviceWorker: {
      getRegistrations: async () => [{
        scope: 'http://localhost:4173/',
        unregister: async () => { throw new Error('unregister denied'); }
      }],
      controller: {}
    },
    cacheStorage: {
      keys: async () => ['mira-signal-old'],
      delete: async () => { throw new Error('cache locked'); }
    },
    appScope: 'http://localhost:4173/',
    sessionStore: memorySession(),
    reload: () => { reloads += 1; }
  });

  assert.equal(result.errors.some(error => error.code === 'unregister-failed'), true);
  assert.equal(result.errors.some(error => error.code === 'cache-delete-failed'), true);
  assert.equal(result.reloadTriggered, false);
  assert.equal(reloads, 0);
});

test('works when Service Worker and Cache Storage APIs are unavailable', async () => {
  const result = await cleanupDevelopmentOfflineState({
    serviceWorker: undefined,
    cacheStorage: undefined,
    appScope: 'http://localhost:4173/',
    sessionStore: memorySession(),
    reload: () => assert.fail('reload must not run')
  });

  assert.equal(result.registrationFound, false);
  assert.equal(result.controllerStillActive, false);
  assert.equal(result.reloadRequired, false);
  assert.deepEqual(result.deletedCacheNames, []);
  assert.deepEqual(result.errors, []);
});
