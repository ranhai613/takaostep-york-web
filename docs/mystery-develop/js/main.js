import { validateAll, assertValid } from './core/content-validator.js';
import { getPuzzleBriefingClip, getPuzzleBriefingEventId, getTravelClips } from './core/dialogue-flow.js';
import { createInitialState, reducePlayerState } from './core/game-state.js';
import { resolveRuntimeMode } from './core/runtime-mode.js';
import { transition } from './core/state-machine.js';
import { isAcceptedAnswer } from './core/answer-normalizer.js';
import { createStateStore } from './services/storage.js';
import { prepareAssets, cleanupStaleCaches } from './services/asset-preloader.js';
import { cleanupDevelopmentOfflineState, clearDevelopmentReloadGuard } from './services/offline-control.js';
import { AudioQueue } from './services/audio-queue.js';
import { LocationWatcher } from './services/location.js';
import { Renderer, escapeHtml, formatPartProgress } from './ui/renderer.js';
import { MapView } from './ui/map-view.js';
import { showDevicePickup, showPreparation, showIntro, showTravel, showPuzzleBriefing, showPuzzle, showFinal, showFatal, showAssetFailure, showDevelopmentCleanupFailure } from './ui/screens.js';

const renderer=new Renderer();
const store=createStateStore();
const mapView=new MapView({onTileError:message=>renderer.announce(message)});
const runtimeMode=resolveRuntimeMode({hostname:location.hostname,search:location.search});
let release,assets,content,state,savedResult;
let locationWatcher;
let selectedLetter=null;

const fetchJson=async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.json()};
const clipById=id=>content.audioClips.find(clip=>clip.id===id);
const playbackPriority=clip=>clip.kind==='main'?20000+(clip.priority??0):clip.kind==='bridge'?10000+(clip.priority??0):(clip.priority??0);
const travelDelayClip=clip=>({id:`system-travel-delay-${clip.id}`,kind:'system',src:'./assets/audio/silence-10s.mp3',subtitle:'',priority:0,transient:true});
const audioQueue=new AudioQueue({
  onSubtitle:(subtitle)=>{const box=document.querySelector('.subtitle');if(box&&subtitle)box.textContent=subtitle},
  onProgress:(clip,seconds)=>{if(!clip||clip.transient||!state)return;commit(reducePlayerState(state,{type:'audio-progress',audioId:clip.id,seconds}),{render:false})},
  onStatus:({status,clip})=>{if(status==='failed')renderer.announce('音声の自動再生がブロックされました。「通信を再生」を押してください。');if(status==='ended'&&clip&&!clip.transient&&state)commit(reducePlayerState(state,{type:'audio-listened',audioId:clip.id}),{render:false})}
});

function commit(next,{render=true}={}){
  try{store.save(next);state=next;if(render)renderState();return true}catch(error){renderer.showDialog({title:'進行を保存できません',body:'<p>ブラウザの保存領域を確認してください。画面を閉じる前に再試行してください。</p>',confirmText:'確認',cancelText:''});console.error(error);return false}
}

function runTransition(event,{render=true}={}){try{return commit(transition(state,event),{render})}catch(error){console.warn(error);renderer.announce(error.message);return false}}
function inventory(){return renderer.inventory(content.parts,state.collectedPartIds)}
function updateStatusButton(){const button=document.querySelector('#status-button');const progress=content&&state?formatPartProgress(content.parts,state.collectedPartIds):'?/?/?/?';button.textContent=progress;button.setAttribute('aria-label',`進行状況を表示。回収パーツ ${progress}`)}
function currentSpot(){return [...content.spots].sort((a,b)=>a.order-b.order)[Math.min(state.solvedPuzzleIds.filter(id=>id!=='q4').length,3)]}
function hintCount(puzzle){return state.viewedHintIds.filter(id=>id.startsWith(`${puzzle.id}-hint-`)).length}

function renderState(){
  updateStatusButton();
  mapView.destroy();locationWatcher?.stop();
  if(state.endingSeen&&state.currentSceneId==='completed'){renderer.showMemorial(content.parts,()=>renderer.showEnding(clipById('audio-ending').subtitle,()=>renderState()));return}
  if(state.currentSceneId==='s00'){showPreparation(renderer,{onReady:()=>runTransition({type:'acknowledge-safety'})});return}
  if(state.currentSceneId==='s01'&&!state.completedEventIds.includes('terminal-picked-up')){showDevicePickup(renderer,{onPickup:()=>commit(reducePlayerState(state,{type:'complete-event',id:'terminal-picked-up'}))});return}
  if(['s01','s02','s03'].includes(state.currentSceneId)){const intro=clipById('audio-intro');showIntro(renderer,{step:state.currentSceneId,clip:intro,onAudioTest:async()=>{await audioQueue.unlock();renderer.tone();renderer.announce('確認音を再生しました')},onAudio:action=>handleAudio(action,[intro]),onSubtitle:()=>{audioQueue.clear();commit(reducePlayerState(state,{type:'navigate',sceneId:'s03'}))},onNext:async()=>{if(state.currentSceneId==='s01')commit(reducePlayerState(state,{type:'navigate',sceneId:'s02'}));else if(state.currentSceneId==='s02'){commit(reducePlayerState(state,{type:'navigate',sceneId:'s03'}));await handleAudio('play',[intro])}else if(runTransition({type:'complete-intro'}))startTravelAudioWithDelay()}});return}
  if(state.currentSceneId==='s04'){renderTravel();return}
  if(['s05','s06'].includes(state.currentSceneId)){renderPuzzleScreen();return}
  if(state.currentSceneId==='s07'){const puzzle=content.puzzles.find(item=>state.solvedPuzzleIds.includes(item.id)&&!state.completedEventIds.includes(`${item.id}-continued`))??content.puzzles[Math.max(0,state.solvedPuzzleIds.length-1)];const part=content.parts.find(item=>item.id===puzzle.partId);renderer.showPartAcquired(part,puzzle,inventory(),()=>{let next=reducePlayerState(state,{type:'complete-event',id:`${puzzle.id}-continued`});next=transition(next,{type:'advance-after-part'});if(commit(next))startTravelAudioWithDelay()});return}
  if(['s08','s09'].includes(state.currentSceneId)){renderFinal();return}
  if(state.currentSceneId==='s10'){renderer.showEnding(clipById('audio-ending').subtitle,()=>runTransition({type:'complete-ending'}));return}
  showFatal(renderer,'進行状態を読み取れません',`不明な画面ID: ${state.currentSceneId}`,()=>location.reload());
}

function renderTravel(){
  const spot=currentSpot(),index=spot.order;
  const trigger=index===1?'intro-completed':`q${index-1}-solved`;
  const routeClips=getTravelClips(content.audioClips,trigger);
  showTravel(renderer,{spot,index,inventory:inventory(),subtitle:routeClips[0]?.subtitle??'',onArrive:()=>arriveAt(spot),onLocation:()=>startLocation(spot),onAudio:action=>handleAudio(action,routeClips)});
  mapView.mount(document.querySelector('#map'),spot,release.map);
}

function startTravelAudioWithDelay(){
  const spot=currentSpot(),trigger=spot.order===1?'intro-completed':`q${spot.order-1}-solved`;
  const clips=getTravelClips(content.audioClips,trigger).filter(clip=>!state.listenedAudioIds.includes(clip.id));
  if(clips.length)handleAudio('delayed-play',clips);
}

function startLocation(spot){
  const status=document.querySelector('#location-status');
  locationWatcher=new LocationWatcher({onPosition:result=>{mapView.updatePosition({lat:result.lat,lng:result.lng});status.textContent=result.accuracyWarning?`精度が低いため確認中（誤差 約${Math.round(result.accuracyM)}m）`:`目的地点まで約${Math.round(result.distanceM)}m`;if(result.arrived)arriveAt(spot)},onStatus:event=>{const labels={requesting:'位置情報の許可を確認しています…','permission-denied':'位置情報が拒否されました。到着ボタンで進めます。',unavailable:'位置情報を取得できません。到着ボタンで進めます。',timeout:'位置情報がタイムアウトしました。到着ボタンで進めます。',unsupported:'このブラウザでは位置情報を使えません。到着ボタンで進めます。'};if(labels[event.status])status.textContent=labels[event.status]}});
  locationWatcher.start(spot);
}

function arriveAt(spot){if(state.reachedSpotIds.includes(spot.id))return;locationWatcher?.stop();if(runTransition({type:'arrive',spotId:spot.id},{render:false})){renderer.arrivalEffect();setTimeout(renderState,650)}}

async function handleAudio(action,clips){
  if(action==='pause'){audioQueue.pause();return}if(action==='rewind'){const activeId=audioQueue.activeClip?.id;const target=audioQueue.rewind(10,activeId?state.audioProgress[activeId]:0);if(target===null){renderer.announce('再生中の音声がありません');return}if(activeId)commit(reducePlayerState(state,{type:'audio-progress',audioId:activeId,seconds:target}),{render:false});renderer.announce(target===0?'音声の先頭まで戻しました':`10秒戻しました。${Math.floor(target)}秒から再生します`);return}
  if(action==='priority-play')audioQueue.clear();
  if(action==='restart'&&audioQueue.activeClip){audioQueue.restart();await audioQueue.resume();renderer.announce('最初から再生します');return}
  if(action==='play'&&audioQueue.activeClip?.src){await audioQueue.resume();return}
  if(audioQueue.activeClip&&!audioQueue.activeClip.src)audioQueue.finishActive();
  const unlistened=clips.filter(clip=>!state.listenedAudioIds.includes(clip.id));
  const candidates=unlistened.length?unlistened:clips;
  if(action==='delayed-play'){
    const ordered=[...candidates].sort((a,b)=>playbackPriority(b)-playbackPriority(a));
    audioQueue.enqueueSequence(ordered.flatMap(clip=>clip.kind==='bridge'?[travelDelayClip(clip),clip]:[clip]));
  }else for(const clip of candidates)audioQueue.enqueue(clip);
  const clip=await audioQueue.playNext();
  if(action==='restart')renderer.announce('最初から再生します');else if(action==='delayed-play')renderer.announce('10秒後に通信を再生します');
  if(clip&&!clip.src){renderer.announce('音声素材は準備中です。全文字幕を表示しています。');commit(reducePlayerState(state,{type:'audio-listened',audioId:clip.id}),{render:false})}
}

function renderPuzzleScreen(){
  const index=Number(state.reachedSpotIds.at(-1)?.match(/\d+/)?.[0]);const puzzle=content.puzzles.find(item=>item.order===index);if(!puzzle){showFatal(renderer,'問題を読み込めません','現在地点に対応する問題がありません。',renderState);return}
  const briefing=getPuzzleBriefingClip(content.audioClips,puzzle.order);
  const briefingEventId=getPuzzleBriefingEventId(puzzle.id);
  if(briefing&&!state.completedEventIds.includes(briefingEventId)){
    showPuzzleBriefing(renderer,{puzzle,clip:briefing,onAudio:action=>handleAudio(action,[briefing]),onContinue:()=>{audioQueue.clear();let next=reducePlayerState(state,{type:'audio-listened',audioId:briefing.id});next=reducePlayerState(next,{type:'complete-event',id:briefingEventId});commit(next)}});
    handleAudio('priority-play',[briefing]);
    return;
  }
  showPuzzle(renderer,{puzzle,hintCount:hintCount(puzzle),inventory:inventory(),onSubmit:(answer,feedback)=>{if(!isAcceptedAnswer(answer,puzzle.acceptedAnswers,puzzle.normalizationRules)){feedback.className='feedback error';feedback.textContent='認証できませんでした。入力を見直すか、ヒントを確認してください。';return}runTransition({type:'solve',puzzleId:puzzle.id,correct:true,partId:puzzle.partId})},onHint:()=>runTransition({type:'view-hint',puzzleId:puzzle.id,hintIndex:hintCount(puzzle)}),onZoom:()=>renderer.showDialog({title:'問題画像',body:`<img class="puzzle-image" src="${escapeHtml(puzzle.image)}" alt="${escapeHtml(puzzle.altText)}"><p>${escapeHtml(puzzle.altText)}</p>`,confirmText:'閉じる',cancelText:''})});
}

function renderFinal(){
  const puzzle=content.puzzles.find(item=>item.id==='q4');
  const finalConnection=content.audioClips.find(clip=>clip.id==='audio-final-connection');
  showFinal(renderer,{puzzle,subtitle:finalConnection?.subtitle??'',order:state.q4Order,selected:selectedLetter,inventory:inventory(),hintCount:hintCount(puzzle),onSelect:index=>{if(selectedLetter===null){selectedLetter=index;return {order:state.q4Order,selected:selectedLetter}}if(selectedLetter===index){selectedLetter=null;return {order:state.q4Order,selected:selectedLetter}}const from=selectedLetter;selectedLetter=null;commit(reducePlayerState(state,{type:'q4-swap',from,to:index}),{render:false});return {order:state.q4Order,selected:selectedLetter}},onSubmit:feedback=>{if(state.q4Order.join('')!=='MIRA'){feedback.className='feedback error';feedback.textContent='登録情報と一致しません。並びを変えて再試行してください。';return}runTransition({type:'authenticate-final'})},onHint:()=>runTransition({type:'view-hint',puzzleId:'q4',hintIndex:hintCount(puzzle)})});
}

function offerFreshStart(message){showFatal(renderer,'保存状態をそのまま再開できません',message,()=>renderer.showDialog({title:'新しく始めますか？',body:'<p>この端末のゲーム進行だけを削除します。準備済み素材は保持されます。</p>',confirmText:'進行を初期化',cancelText:'戻る',danger:true,onConfirm:()=>{store.reset(true);state=createInitialState(release.releaseId);renderState()}}))}

async function registerServiceWorker(){if(!('serviceWorker'in navigator))return null;try{const registration=await navigator.serviceWorker.register('./service-worker.js');registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)renderer.announce('新しい公開版があります。安全な場所で再読込してください。')})});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('mira-sw-controlled')){sessionStorage.setItem('mira-sw-controlled','1');location.reload()}});return registration}catch(error){console.warn('Service Worker registration failed',error);return null}}

async function loadTestProfile(){if(release.initialStateProfile!=='test')return null;if(!runtimeMode.isLocal)throw new Error('test initialStateProfile is blocked outside localhost');const name=new URLSearchParams(location.search).get('profile')??'q2-arrived';const profile=await fetchJson(`./tests/fixtures/release-profiles/${name}.json`);return profile.state?{...createInitialState(release.releaseId),...profile.state,releaseId:release.releaseId,updatedAt:new Date().toISOString()}:null}

async function bootstrap(){
  try{
    if(runtimeMode.cleanupRequired){
      const detail=document.querySelector('#loading-detail');
      if(detail)detail.textContent='開発用のオフライン制御を整理しています…';
      const cleanup=await cleanupDevelopmentOfflineState({appScope:new URL('./',location.href).href});
      if(cleanup.reloadTriggered)return;
      if(cleanup.errors.length){showDevelopmentCleanupFailure(renderer,cleanup,()=>{clearDevelopmentReloadGuard();location.reload()});return}
    }
    [release]=await Promise.all([fetchJson('./data/release-config.json')]);
    [assets,content]=await Promise.all([fetchJson(release.assetManifestPath),fetchJson(release.contentPath)]);
    if(release.routeMode==='alternate'){
      const alternate=await fetchJson('./data/route-alternate.json');
      if(alternate.releaseId!==release.releaseId)throw new Error('alternate route releaseId mismatch');
      content.spots=content.spots.map(spot=>spot.id==='spot-4'?alternate.spot:spot);
    }
    assertValid(validateAll({release,assets,content},{production:runtimeMode.kind==='production'}));
    if(runtimeMode.offlineEnabled)await registerServiceWorker();
    const progress=document.querySelector('#loading-progress'),detail=document.querySelector('#loading-detail');
    const persist=runtimeMode.offlineEnabled&&'caches'in globalThis;
    const prepared=await prepareAssets({required:assets.required,optional:assets.optional,cacheName:release.cacheName,persist,onProgress:item=>{progress.value=item.percent;detail.textContent=`${persist?'必須素材を準備中':'最新素材を確認中'}… ${item.completed}/${item.total}`}});
    if(persist)await cleanupStaleCaches(caches,release.cacheName);
    if(!prepared.ready){showAssetFailure(renderer,prepared,bootstrap);return}
    const profile=await loadTestProfile();savedResult=profile?{status:'test',state:profile}:store.load(release);
    if(['corrupt','incompatible'].includes(savedResult.status)){offerFreshStart(savedResult.status==='corrupt'?'保存データが破損しています。削除せず保持しています。':'公開版との互換性を確認できません。旧状態は削除せず保持しています。');return}
    if(savedResult.state){state=savedResult.state;updateStatusButton();showPreparation(renderer,{hasSaved:true,onContinue:renderState,onNew:()=>renderer.showDialog({title:'新しく始めますか？',body:'<p>この端末の進行状態だけを初期化します。</p>',confirmText:'新しく始める',cancelText:'続きに戻る',danger:true,onConfirm:()=>{store.reset(true);state=createInitialState(release.releaseId);renderState()}})});return}
    state=createInitialState(release.releaseId);showPreparation(renderer,{onReady:()=>runTransition({type:'acknowledge-safety'})});
  }catch(error){console.error(error);showFatal(renderer,'ゲームを起動できません',error.message,()=>location.reload())}
}

document.querySelector('#status-button').addEventListener('click',()=>{if(!state||!content)return;renderer.showDialog({title:'現在の進行',body:`${inventory()}<p>章：${escapeHtml(content.chapters.find(chapter=>chapter.id===state.chapterId)?.title??state.chapterId)}</p><p>完了した謎：${state.solvedPuzzleIds.length} / 4</p>`,confirmText:'閉じる',cancelText:''})});
const offline=document.querySelector('#offline-banner');const updateOnline=()=>{offline.hidden=navigator.onLine};addEventListener('online',updateOnline);addEventListener('offline',updateOnline);updateOnline();
bootstrap();
