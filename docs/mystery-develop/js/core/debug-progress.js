import { createInitialState, reducePlayerState } from './game-state.js';
import { transition } from './state-machine.js';

export const DEBUG_STAGES=Object.freeze([
  {id:'preparation',label:'準備画面'},
  {id:'device',label:'端末を拾う'},
  {id:'incoming',label:'着信画面'},
  {id:'intro',label:'ミラからの依頼'},
  {id:'travel-1',label:'第1観測点へ移動'},
  {id:'briefing-1',label:'Q1 導入通信'},
  {id:'puzzle-1',label:'Q1 問題'},
  {id:'part-1',label:'Q1 解答後・パーツ獲得'},
  {id:'travel-2',label:'第2観測点へ移動'},
  {id:'briefing-2',label:'Q2 導入通信'},
  {id:'puzzle-2',label:'Q2 問題'},
  {id:'part-2',label:'Q2 解答後・パーツ獲得'},
  {id:'travel-3',label:'第3観測点へ移動'},
  {id:'briefing-3',label:'Q3 導入通信'},
  {id:'puzzle-3',label:'Q3 問題'},
  {id:'part-3',label:'Q3 解答後・パーツ獲得'},
  {id:'travel-4',label:'最終地点へ移動'},
  {id:'final',label:'Q4 最終認証'},
  {id:'repair',label:'船体復旧演出'},
  {id:'ending',label:'帰還通信'},
  {id:'completed',label:'任務完了'}
]);

export const showDebugControls=(runtimeMode,release)=>Boolean(runtimeMode?.isLocal&&release?.debugMode===true);

export function buildDebugState(releaseId,stageId,now){
  if(!DEBUG_STAGES.some(stage=>stage.id===stageId))throw new RangeError(`Unknown debug stage: ${stageId}`);
  let state=createInitialState(releaseId,now);
  const snapshots=new Map();
  const capture=id=>snapshots.set(id,structuredClone(state));
  capture('preparation');
  state=transition(state,{type:'acknowledge-safety'},now);
  capture('device');
  state=reducePlayerState(state,{type:'complete-event',id:'terminal-picked-up'},now);
  state=reducePlayerState(state,{type:'navigate',sceneId:'s02'},now);
  capture('incoming');
  state=reducePlayerState(state,{type:'navigate',sceneId:'s03'},now);
  capture('intro');
  state=transition(state,{type:'complete-intro'},now);
  capture('travel-1');
  const partIds=['part-r','part-a','part-m'];
  for(let index=1;index<=3;index++){
    state=transition(state,{type:'arrive',spotId:`spot-${index}`},now);
    capture(`briefing-${index}`);
    state=reducePlayerState(state,{type:'audio-listened',audioId:`audio-main-${index}`},now);
    state=reducePlayerState(state,{type:'complete-event',id:`q${index}-briefing-completed`},now);
    state=reducePlayerState(state,{type:'navigate',sceneId:'s06'},now);
    capture(`puzzle-${index}`);
    state=transition(state,{type:'solve',puzzleId:`q${index}`,correct:true,partId:partIds[index-1]},now);
    capture(`part-${index}`);
    state=reducePlayerState(state,{type:'complete-event',id:`q${index}-continued`},now);
    state=transition(state,{type:'advance-after-part'},now);
    capture(`travel-${index+1}`);
  }
  state=transition(state,{type:'arrive',spotId:'spot-4'},now);
  capture('final');
  state=reducePlayerState(state,{type:'q4-swap',from:0,to:2},now);
  state=reducePlayerState(state,{type:'q4-swap',from:1,to:3},now);
  state=transition(state,{type:'authenticate-final'},now);
  capture('repair');
  state=transition(state,{type:'complete-repair'},now);
  capture('ending');
  state=transition(state,{type:'complete-ending'},now);
  capture('completed');
  return snapshots.get(stageId);
}

export function debugStageForState(state){
  if(!state)return 'preparation';
  switch(state.currentSceneId){
    case 's00':return 'preparation';
    case 's01':return state.completedEventIds.includes('terminal-picked-up')?'incoming':'device';
    case 's02':return 'incoming';
    case 's03':return 'intro';
    case 's04':return `travel-${Math.min(state.solvedPuzzleIds.length+1,4)}`;
    case 's05':case 's06':{
      const index=Number(state.reachedSpotIds.at(-1)?.match(/\d+/)?.[0])||1;
      return `${state.completedEventIds.includes(`q${index}-briefing-completed`)?'puzzle':'briefing'}-${index}`;
    }
    case 's07':return `part-${state.solvedPuzzleIds.length}`;
    case 's08':return 'final';
    case 's09':return 'repair';
    case 's10':return 'ending';
    case 'completed':return 'completed';
    default:return 'preparation';
  }
}
