export const BGM_SOURCES=Object.freeze({
  ki:'./assets/audio/bgm/ki.mp3',
  shou:'./assets/audio/bgm/shou.mp3',
  ten:'./assets/audio/bgm/ten.mp3',
  ketsu:'./assets/audio/bgm/ketsu.mp3',
  ed:'./assets/audio/bgm/ed.mp3'
});

const fieldTracks=['ki','shou','ten','ketsu'];

export function getBgmTrack(state){
  if(!state)return null;
  const solved=(state.solvedPuzzleIds??[]).filter(id=>['q1','q2','q3'].includes(id)).length;
  switch(state.currentSceneId){
    case 's01':return state.completedEventIds?.includes('terminal-picked-up')?'ki':null;
    case 's02':case 's03':return 'ki';
    case 's04':return fieldTracks[Math.min(solved,3)];
    case 's05':case 's06':{
      const order=Number(state.reachedSpotIds?.at(-1)?.match(/\d+/)?.[0])||solved+1;
      return fieldTracks[Math.max(0,Math.min(order-1,3))];
    }
    case 's07':return fieldTracks[Math.max(0,Math.min(solved-1,2))];
    case 's08':case 's09':return 'ketsu';
    case 's10':case 'completed':return 'ed';
    default:return null;
  }
}
