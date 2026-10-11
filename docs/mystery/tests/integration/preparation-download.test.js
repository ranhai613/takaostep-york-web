import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createInitialState } from '../../js/core/game-state.js';

const source=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const extract=name=>{
  const start=source.indexOf(`function ${name}(`);
  return source.slice(source.slice(Math.max(0,start-6),start)==='async '?start-6:start,source.indexOf('\n}',start)+2);
};
function harness({saved=null,prepare=async()=>({ready:true})}={}){
  const events=[],ui={};
  const config={releaseId:'test',routeMode:'primary',cacheName:'test',assetManifestPath:'assets',contentPath:'content'};
  const context=vm.createContext({
    console,createInitialState,
    runtimeMode:{offlineEnabled:true,cleanupRequired:false,kind:'production'},
    renderer:{announce(){},showDialog(){}},
    document:{querySelector:()=>({})},caches:{},
    fetchJson:async path=>{events.push(`fetch:${path}`);return path.includes('release-config')?config:path==='assets'?{required:['image'],optional:['audio'],downloadBytes:52000000}:{}},
    validateAll:()=>[],validateRoutes:()=>[],assertValid(){},showDebugControls:()=>false,
    createStateStore:()=>({load:()=>({state:saved})}),PLAYER_STATE_KEY:'state',
    loadTestProfile:async()=>null,updateStatusButton(){},
    showPreparation:(_renderer,options)=>{ui.preparation=options;events.push('preparation')},
    showAssetDownload:()=>events.push('download-screen'),
    prepareAssets:async options=>{events.push('download');options.onProgress({percent:50,completed:1,total:2});return prepare()},
    cleanupStaleCaches:async()=>events.push('cleanup'),
    registerServiceWorker:async()=>events.push('register'),unlockBgm:()=>events.push('unlock'),
    runTransition:event=>events.push(event.type),renderState:()=>events.push('resume'),
    showAssetFailure:(_renderer,_result,retry)=>{ui.retry=retry;events.push('failure')},
    showFatal:(_renderer,_title,message)=>assert.fail(message),
    offerFreshStart:()=>assert.fail('valid state should start'),
  });
  vm.runInContext(`let release,assets,content,state,savedResult,store,routes,developerMode;let assetsReady=false,preparingAssets=false,downloadStarted=false;
    ${extract('renderPreparation')}
    ${extract('prepareForPlay')}
    ${extract('bootstrap')}
    this.app={bootstrap,prepareForPlay};`,context);
  return {events,ui,app:context.app};
}

test('startup shows the size warning before registering or downloading, and waits for downloads before advancing',async()=>{
  let finish;
  const {events,ui,app}=harness({prepare:()=>new Promise(resolve=>{finish=resolve})});
  await app.bootstrap();
  assert.deepEqual(events,['fetch:./data/release-config.json','fetch:assets','fetch:content','preparation']);
  assert.equal(ui.preparation.downloadBytes,52000000);
  const started=ui.preparation.onReady();
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(events.includes('download'));assert.equal(events.includes('acknowledge-safety'),false);
  await ui.preparation.onReady();assert.equal(events.filter(item=>item==='download').length,1);
  finish({ready:true});await started;
  assert.equal(events.at(-1),'acknowledge-safety');
});

test('saved progress downloads only after Continue is pressed',async()=>{
  const {events,ui,app}=harness({saved:createInitialState('test')});
  await app.bootstrap();assert.equal(ui.preparation.hasSaved,true);
  assert.equal(events.includes('download'),false);
  await ui.preparation.onContinue();assert.equal(events.at(-1),'resume');
  assert.ok(events.indexOf('download')<events.indexOf('resume'));
});

test('failed required assets keep the game stopped and can be retried',async()=>{
  let attempts=0;
  const {events,ui,app}=harness({prepare:async()=>({ready:++attempts>1,requiredFailed:['image']})});
  await app.bootstrap();await ui.preparation.onReady();
  assert.equal(events.at(-1),'failure');assert.equal(events.includes('acknowledge-safety'),false);
  await ui.retry();assert.equal(attempts,2);assert.equal(events.at(-1),'acknowledge-safety');
});

test('Service Worker installation cannot start a bulk download',async()=>{
  const listeners={};let skipped=false,fetches=0,installation;
  const worker=await readFile(new URL('../../service-worker.js',import.meta.url),'utf8');
  vm.runInNewContext(worker,{
    self:{addEventListener:(name,callback)=>{listeners[name]=callback},skipWaiting:async()=>{skipped=true}},
    fetch:async()=>{fetches++;throw new Error('download before consent')},console,URL
  });
  listeners.install({waitUntil:promise=>{installation=promise}});await installation;
  assert.equal(skipped,true);assert.equal(fetches,0);
});
