# Development Mode Contract

## Mode Resolution

| Host | Query | Mode | Offline control |
|---|---|---|---|
| `localhost`, `127.0.0.1`, `[::1]` | exact `sw=1` | `offline-test` | Enabled |
| `localhost`, `127.0.0.1`, `[::1]` | absent or any other value | `development` | Disabled |
| Any non-local host | any query | `production` | Enabled |

- `sw=1` is the only opt-in value. `?sw`, `?sw=true`, and `?sw=0` remain normal development on local hosts.
- Other parameters may coexist; for example `?sw=1&profile=q2-arrived`.
- A query parameter must never disable offline behavior on a non-local participant deployment.

## Development Cleanup

On entry to `development` mode:

1. Resolve only the Service Worker registration whose scope equals the current application root.
2. Unregister that registration when present.
3. Enumerate same-origin Cache Storage and delete only names beginning with `mira-signal-`.
4. Do not clear or rewrite `localStorage`, including `takaostep:mystery:player-state`.
5. Do not unregister broader/different scopes or delete cache names owned by another application.
6. If the current page remains controlled, automatically reload at most once per tab session after cleanup.
7. If cleanup fails or a second reload would be required, show a retryable developer-facing error instead of continuing under an ambiguous cache state.

After cleanup, required and optional asset availability may be checked over the network, but responses are not persisted to Cache Storage.

## Offline-test and Production

- Register the application Service Worker and prepare the versioned required assets before starting.
- Use the same update, offline fallback, and stale MIRA-cache cleanup paths in both modes.
- `offline-test` is enabled only through the local URL and has no participant-facing UI toggle.
- Returning from `offline-test` to the plain local URL invokes Development Cleanup while preserving PlayerState.

## Verification Matrix

| Scenario | Expected result |
|---|---|
| Edit JSON/image in normal local development, then ordinary reload | Latest bytes are shown; no cache-generation edit or hard reload |
| Visit local `?sw=1`, prepare assets, then go offline | Cached flow remains completable |
| Return from `?sw=1` to plain local URL | App registration/MIRA caches removed; latest files shown; PlayerState retained |
| Visit deployed HTTPS URL with `?sw=0` | Production offline behavior remains enabled |
| Same origin contains a non-MIRA cache | Non-MIRA cache remains untouched |
