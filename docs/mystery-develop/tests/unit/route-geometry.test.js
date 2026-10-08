import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRoutes, getRouteForSpot } from '../../js/core/route-geometry.js';

const routes=JSON.parse(await readFile(new URL('../../data/routes-primary.geojson',import.meta.url),'utf8'));
const {spots}=JSON.parse(await readFile(new URL('../../data/content.json',import.meta.url),'utf8'));

test('published route IDs select all four legs and end at the matching target',()=>{
  assert.deepEqual(validateRoutes(routes),[]);
  for(const spot of spots){
    const route=getRouteForSpot(routes,spot);
    assert.equal(route.id,spot.order);
    assert.deepEqual(route.geometry.coordinates.at(-1),[spot.lng,spot.lat]);
  }
  const original=structuredClone(routes);
  const first=getRouteForSpot(routes,spots[0]);
  assert.deepEqual(first.geometry.coordinates[0],routes.features[0].geometry.coordinates.at(-1));
  assert.deepEqual(routes,original);
  first.geometry.coordinates[0][0]=0;
  assert.deepEqual(routes,original);
});

test('alternate mode keeps the first three legs and never shows the primary final leg',()=>{
  for(const spot of spots.slice(0,3))assert.equal(getRouteForSpot(routes,spot,'alternate').id,spot.order);
  assert.equal(getRouteForSpot(routes,spots[3],'alternate'),null);
  assert.equal(getRouteForSpot(null,spots[0]),null);
});

test('malformed files, ambiguous IDs and invalid coordinates cannot be displayed',()=>{
  for(const invalid of [null,{}, {type:'FeatureCollection',features:[]}])assert.ok(validateRoutes(invalid).length);
  const duplicate=structuredClone(routes);duplicate.features[3].id=1;assert.ok(validateRoutes(duplicate).length);
  const stringId=structuredClone(routes);stringId.features[0].id='1';assert.ok(validateRoutes(stringId).length);
  for(const coordinates of [[[139,35]],[[35,139],[35,139]],[[181,35],[139,35]],[[139,NaN],[139,35]]]){
    const invalid=structuredClone(routes);invalid.features[0].geometry.coordinates=coordinates;assert.ok(validateRoutes(invalid).length);
  }
  const wrongType=structuredClone(routes);wrongType.features[0].geometry.type='Polygon';assert.ok(validateRoutes(wrongType).length);
});
