const briefingSpotById=new Map([['audio-main-1','spot-1-arrived'],['audio-main-2','spot-2-arrived'],['audio-main-3','spot-3-arrived']]);
const triggerLabels={
  'game-started':'通話開始',
  'intro-completed':'第一観測点へ',
  'q1-solved':'第二観測点へ',
  'q2-solved':'第三観測点へ',
  'q3-solved':'最終地点へ',
  'spot-4-arrived':'最終地点',
  'q4-solved':'帰還通信'
};

export function miraSpeech(subtitle){
  return String(subtitle??'').split(/\n+/u).map(line=>line.trim()).filter(line=>line.startsWith('ミラ：')).map(line=>line.slice('ミラ：'.length).trim()).join('\n\n');
}

export function getConversationLog(audioClips,state){
  if(!state)return [];
  const completed=new Set(state.completedEventIds??[]);
  return audioClips.filter(clip=>['main','bridge'].includes(clip.kind)).filter(clip=>{
    const briefingSpot=briefingSpotById.get(clip.id);
    if(briefingSpot)return completed.has(briefingSpot);
    if(clip.triggerEventId==='game-started')return completed.has('game-started')||state.currentSceneId==='s03';
    const solved=clip.triggerEventId.match(/^q([1-3])-solved$/u);
    if(solved)return completed.has(`q${solved[1]}-continued`);
    return completed.has(clip.triggerEventId);
  }).map(clip=>({id:clip.id,kind:clip.kind,label:briefingSpotById.has(clip.id)?`第${['一','二','三'][Number(clip.id.at(-1))-1]}観測点`:triggerLabels[clip.triggerEventId]??'通信',text:miraSpeech(clip.subtitle)})).filter(entry=>entry.text);
}
