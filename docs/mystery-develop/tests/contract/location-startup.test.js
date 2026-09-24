import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('entering or resuming a travel screen starts geolocation without a second tap', async () => {
  const source=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
  const travel=source.match(/function renderTravel\(\)\{([\s\S]*?)\n\}/u)?.[1];
  assert.ok(travel);
  assert.ok(travel.indexOf('showTravel(renderer') < travel.indexOf('mapView.mount('));
  assert.ok(travel.indexOf('mapView.mount(') < travel.lastIndexOf('startLocation(spot)'));
  assert.match(source,/if\(state\.currentSceneId==='s04'\)\{renderTravel\(\);return\}/u);
  assert.match(source,/function startLocation\(spot\)\{\s*locationWatcher\?\.stop\(\)/u);
});
