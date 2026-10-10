export function formatCallDuration(seconds){
  const total=Math.max(0,Math.floor(Number(seconds)||0));
  const minutes=Math.floor(total/60);
  const clock=`${String(minutes%60).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  return minutes>=60?`${String(Math.floor(minutes/60)).padStart(2,'0')}:${clock}`:clock;
}

export function createCallIsland(root,{onToggle,onRewind,onRestart}){
  const time=root.querySelector('#call-duration');
  const toggle=root.querySelector('#call-toggle');
  const rewind=root.querySelector('#call-rewind');
  const restart=root.querySelector('#call-restart');
  let startedAt=0;
  let timer=null;
  const tick=()=>{time.textContent=formatCallDuration((Date.now()-startedAt)/1000)};
  toggle.addEventListener('click',onToggle);
  rewind.addEventListener('click',onRewind);
  restart.addEventListener('click',onRestart);
  return {
    show(start){
      startedAt=start;
      root.hidden=false;
      tick();
      if(timer===null)timer=setInterval(tick,1000);
    },
    hide(){
      root.hidden=true;
      if(timer!==null){clearInterval(timer);timer=null}
    },
    updatePlayback({canToggle=false,canSeek=false,playing=false}={}){
      toggle.disabled=!canToggle;
      rewind.disabled=restart.disabled=!canSeek;
      root.dataset.playing=String(playing);
      toggle.setAttribute('aria-label',playing?'再生を一時停止':canSeek?'再生を再開':'通信を再生');
      toggle.title=playing?'一時停止':canSeek?'再開':'再生';
    }
  };
}
