import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../js/core/game-state.js';
import { createStateStore } from '../../js/services/storage.js';

class MemoryStorage { constructor(){this.data=new Map()} getItem(k){return this.data.get(k)??null} setItem(k,v){this.data.set(k,v)} removeItem(k){this.data.delete(k)} }
test('saves, loads, migrates compatible releases, preserves incompatible data and resets with confirmation', () => {
  const storage=new MemoryStorage(); const store=createStateStore(storage); const state=createInitialState('old'); store.save(state);
  assert.equal(store.load({releaseId:'new',compatibleReleaseIds:['old']}).state.releaseId,'new');
  store.save(createInitialState('other')); assert.equal(store.load({releaseId:'new',compatibleReleaseIds:[]}).status,'incompatible'); assert.ok(storage.getItem(store.key));
  assert.equal(store.reset(false),false); assert.equal(store.reset(true),true); assert.equal(storage.getItem(store.key),null);
});
test('rejects corruption and forbidden coordinate fields', () => {
  const storage=new MemoryStorage(); const store=createStateStore(storage); storage.setItem(store.key,'{broken'); assert.equal(store.load({releaseId:'r'}).status,'corrupt');
  const state=createInitialState('r'); state.coordinates=[1,2]; assert.throws(()=>store.save(state),/invalid/i);
});
