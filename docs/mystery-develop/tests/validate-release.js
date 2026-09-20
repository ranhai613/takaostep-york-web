import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { validateAll, assertValid } from '../js/core/content-validator.js';
import { createInitialState, reducePlayerState } from '../js/core/game-state.js';
import { distanceMeters } from '../js/services/location.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const [release,assets,content]=await Promise.all(['data/release-config.json','data/asset-manifest.json','data/content.json'].map(json));
assertValid(validateAll({release,assets,content},{production:true}));
assert.equal(release.initialStateProfile,'normal');
assert.ok(assets.required.every(path=>!/^https?:/i.test(path)),'required assets must not use a CDN');
for(const path of assets.required)await access(resolve(root,path.replace(/^\.\//,'')));
const state=createInitialState(release.releaseId);
const started=performance.now();
let sample=state;for(let index=0;index<1000;index++){sample=reducePlayerState(sample,{type:'audio-progress',audioId:'benchmark',seconds:index});distanceMeters({lat:35.63,lng:139.27},{lat:35.64,lng:139.28})}
const elapsed=performance.now()-started;
assert.ok(elapsed<1000,`1000 state/location operations took ${elapsed.toFixed(1)}ms`);
const bytes=(await Promise.all(assets.required.map(async path=>(await stat(resolve(root,path.replace(/^\.\//,'')))).size))).reduce((a,b)=>a+b,0);
const appSource=await readFile(resolve(root,'js/main.js'),'utf8');
assert.ok(!/(google-analytics|gtag\(|posthog|segment\.io|mixpanel)/i.test(appSource),'external analytics reference found');
assert.ok(!/(localStorage|store\.save).*?(latitude|longitude|coordinates)/is.test(appSource),'possible coordinate persistence found');
console.log(JSON.stringify({status:'PASS',releaseId:release.releaseId,requiredAssets:assets.required.length,requiredBytes:bytes,benchmarkMs:Number(elapsed.toFixed(1))},null,2));
