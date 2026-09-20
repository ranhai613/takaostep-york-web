import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateReleaseConfig } from '../../js/core/content-validator.js';

test('production release is normal and supports declared route modes', async () => {
  const release = JSON.parse(await readFile(new URL('../../data/release-config.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateReleaseConfig(release, { production: true }), []);
  assert.ok(['primary', 'alternate'].includes(release.routeMode));
  assert.ok(Array.isArray(release.compatibleReleaseIds));
});

test('alternate route defines only the final player-confirmable spot for the matching release', async () => {
  const [release,alternate]=await Promise.all(['../../data/release-config.json','../../data/route-alternate.json'].map(async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'))));
  assert.equal(alternate.releaseId,release.releaseId);
  assert.equal(alternate.spot.id,'spot-4');
  assert.equal(alternate.spot.fallbackMode,'player-confirmation');
});

test('service worker uses network-first delivery for changing content with offline fallback', async () => {
  const source=await readFile(new URL('../../service-worker.js',import.meta.url),'utf8');
  assert.match(source,/request\.mode==='navigate'\|\|url\.pathname\.includes\('\/data\/'\)/u);
  assert.match(source,/changingContent\?networkFirst/u);
  assert.match(source,/const cached=await caches\.match\(request\)/u);
  assert.match(source,/isDevelopmentRequest\(event,url\)/u);
  assert.match(source,/fetch\(event\.request,\{cache:'no-store'\}\)/u);
});

test('startup gates offline control by runtime mode and cleans development before loading data', async () => {
  const source=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
  const cleanupIndex=source.indexOf('if(runtimeMode.cleanupRequired)');
  const releaseLoadIndex=source.indexOf("fetchJson('./data/release-config.json')");
  assert.ok(cleanupIndex>=0&&cleanupIndex<releaseLoadIndex);
  assert.match(source,/if\(runtimeMode\.offlineEnabled\)await registerServiceWorker\(\)/u);
  assert.match(source,/persist=runtimeMode\.offlineEnabled&&'caches'in globalThis/u);
  assert.match(source,/production:runtimeMode\.kind==='production'/u);
});
