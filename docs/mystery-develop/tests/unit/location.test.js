import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, evaluatePosition, LocationWatcher } from '../../js/services/location.js';

test('Haversine distance and radius boundary are stable', () => {
  assert.equal(Math.round(distanceMeters({lat:35,lng:139},{lat:35,lng:139})), 0);
  const spot = { id:'spot-1', lat:35, lng:139, radiusM:50 };
  assert.equal(evaluatePosition({coords:{latitude:35,longitude:139,accuracy:10}}, spot).arrived, true);
  assert.equal(evaluatePosition({coords:{latitude:35.001,longitude:139,accuracy:300}}, spot).accuracyWarning, true);
  assert.deepEqual(evaluatePosition({coords:{latitude:35,longitude:139,accuracy:10}}, spot),evaluatePosition({coords:{latitude:35,longitude:139,accuracy:10}}, spot));
});

test('watcher reports permission errors and stops cleanly', () => {
  let errorHandler; let cleared = false;
  const geolocation = { watchPosition(_ok, error){errorHandler=error; return 7}, clearWatch(id){cleared=id===7} };
  const events=[]; const watcher = new LocationWatcher({ geolocation, onStatus:event=>events.push(event) });
  watcher.start({id:'spot-1',lat:35,lng:139,radiusM:30}); errorHandler({code:1,message:'denied'}); watcher.stop();
  assert.equal(events.at(-1).status, 'permission-denied'); assert.equal(cleared,true);
});
