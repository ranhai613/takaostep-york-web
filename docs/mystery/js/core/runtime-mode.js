const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function resolveRuntimeMode({ hostname = '', search = '' } = {}) {
  const isLocal = LOCAL_HOSTNAMES.has(String(hostname).toLowerCase());
  const values = new URLSearchParams(search).getAll('sw');
  const offlineRequested = isLocal && values.length === 1 && values[0] === '1';
  const kind = isLocal
    ? (offlineRequested ? 'offline-test' : 'development')
    : 'production';

  return Object.freeze({
    kind,
    isLocal,
    offlineRequested,
    offlineEnabled: kind !== 'development',
    cleanupRequired: kind === 'development'
  });
}
