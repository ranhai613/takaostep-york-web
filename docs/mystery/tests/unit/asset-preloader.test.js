import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAssets, cleanupStaleCaches } from '../../js/services/asset-preloader.js';

test('blocks on required failures, tolerates optional failures, and reports progress', async () => {
  const progress=[]; const cache={put:async()=>{}};
  const fetcher=async path=>path.includes('missing')?{ok:false,status:404}:{ok:true,clone(){return this}};
  const result=await prepareAssets({required:['ok','missing'],optional:['optional-missing'],cacheName:'release-r',fetcher,openCache:async()=>cache,onProgress:p=>progress.push(p)});
  assert.equal(result.ready,false); assert.deepEqual(result.requiredFailed,['missing']); assert.ok(progress.length>=3);
});
test('cleans only stale release caches', async () => {
  const deleted=[]; const cacheStorage={keys:async()=>['mira-a','mira-b','other'],delete:async key=>{deleted.push(key);return true}};
  await cleanupStaleCaches(cacheStorage,'mira-b','mira-'); assert.deepEqual(deleted,['mira-a']);
});

test('development verifies every asset over the network without opening or writing Cache Storage', async () => {
  const fetched=[];
  const result=await prepareAssets({
    required:['./index.html','./data/content.json'],
    optional:['./assets/audio/mira.mp3'],
    cacheName:'mira-signal-release',
    persist:false,
    fetcher:async (path,options)=>{fetched.push({path,options});return {ok:true,clone(){return this}}},
    openCache:async()=>assert.fail('development must not open Cache Storage')
  });

  assert.equal(result.ready,true);
  assert.deepEqual(fetched.map(item=>item.path),['./index.html','./data/content.json','./assets/audio/mira.mp3']);
  assert.equal(fetched.every(item=>item.options.cache==='no-store'),true);
});

test('offline-test and production reuse and populate the versioned cache by default', async () => {
  const stored=new Map([['cached',{ok:true,clone(){return this}}]]);
  let fetches=0;
  const cache={
    match:async path=>stored.get(path),
    put:async (path,response)=>stored.set(path,response)
  };
  const result=await prepareAssets({
    required:['cached','new'],
    cacheName:'mira-signal-release',
    fetcher:async()=>{fetches+=1;return {ok:true,clone(){return this}}},
    openCache:async name=>{assert.equal(name,'mira-signal-release');return cache}
  });

  assert.equal(result.ready,true);
  assert.equal(fetches,1);
  assert.equal(stored.has('new'),true);
});
