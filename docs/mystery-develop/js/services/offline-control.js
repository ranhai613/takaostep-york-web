export const DEVELOPMENT_RELOAD_GUARD = 'mira-development-cleanup-reload';

function errorEntry(code, error) {
  return {
    code,
    message: error instanceof Error ? error.message : String(error)
  };
}

function normalizeScope(scope) {
  try {
    return new URL(scope).href;
  } catch {
    return String(scope);
  }
}

async function findExactRegistration(serviceWorker, appScope) {
  if (!serviceWorker) return null;
  const normalizedScope = normalizeScope(appScope);
  if (typeof serviceWorker.getRegistrations === 'function') {
    const registrations = await serviceWorker.getRegistrations();
    return registrations.find(registration => normalizeScope(registration.scope) === normalizedScope) ?? null;
  }
  if (typeof serviceWorker.getRegistration === 'function') {
    const registration = await serviceWorker.getRegistration(appScope);
    return registration && normalizeScope(registration.scope) === normalizedScope ? registration : null;
  }
  return null;
}

export function clearDevelopmentReloadGuard(sessionStore = globalThis.sessionStorage) {
  sessionStore?.removeItem(DEVELOPMENT_RELOAD_GUARD);
}

export async function cleanupDevelopmentOfflineState({
  serviceWorker = globalThis.navigator?.serviceWorker,
  cacheStorage = globalThis.caches,
  appScope,
  cachePrefix = 'mira-signal-',
  sessionStore = globalThis.sessionStorage,
  reload = () => globalThis.location?.reload()
} = {}) {
  const result = {
    registrationFound: false,
    unregistered: false,
    deletedCacheNames: [],
    controllerStillActive: false,
    reloadRequired: false,
    reloadTriggered: false,
    errors: []
  };

  let registration = null;
  try {
    registration = await findExactRegistration(serviceWorker, appScope);
    result.registrationFound = Boolean(registration);
  } catch (error) {
    result.errors.push(errorEntry('registration-list-failed', error));
  }

  if (registration) {
    try {
      result.unregistered = await registration.unregister();
      if (!result.unregistered) {
        result.errors.push(errorEntry('unregister-failed', 'The registration declined to unregister.'));
      }
    } catch (error) {
      result.errors.push(errorEntry('unregister-failed', error));
    }
  }

  if (cacheStorage && typeof cacheStorage.keys === 'function') {
    let names = [];
    try {
      names = await cacheStorage.keys();
    } catch (error) {
      result.errors.push(errorEntry('cache-list-failed', error));
    }
    for (const name of names.filter(candidate => candidate.startsWith(cachePrefix))) {
      try {
        const deleted = await cacheStorage.delete(name);
        if (deleted) result.deletedCacheNames.push(name);
        else result.errors.push(errorEntry('cache-delete-failed', `Cache was not deleted: ${name}`));
      } catch (error) {
        result.errors.push(errorEntry('cache-delete-failed', error));
      }
    }
  }

  result.controllerStillActive = Boolean(registration && serviceWorker?.controller);
  result.reloadRequired = result.controllerStillActive;

  if (!result.controllerStillActive && result.errors.length === 0) {
    try {
      clearDevelopmentReloadGuard(sessionStore);
    } catch (error) {
      result.errors.push(errorEntry('reload-guard-failed', error));
    }
    return result;
  }

  if (!result.reloadRequired || result.errors.length > 0) return result;

  try {
    if (!sessionStore) {
      result.errors.push(errorEntry('reload-guard-unavailable', 'Session storage is unavailable.'));
      return result;
    }
    if (sessionStore.getItem(DEVELOPMENT_RELOAD_GUARD)) {
      result.errors.push(errorEntry('reload-loop', 'Development cleanup still requires a reload after the automatic retry.'));
      return result;
    }
    sessionStore.setItem(DEVELOPMENT_RELOAD_GUARD, '1');
    result.reloadTriggered = true;
    reload();
  } catch (error) {
    result.reloadTriggered = false;
    result.errors.push(errorEntry('reload-failed', error));
  }

  return result;
}
