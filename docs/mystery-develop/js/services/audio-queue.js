const priority = clip => clip.kind === 'main' ? 20000 + (clip.priority ?? 0) : clip.kind === 'bridge' ? 10000 + (clip.priority ?? 0) : (clip.priority ?? 0);

export class AudioQueue {
  constructor({ audioFactory=()=>new Audio(), onStatus=()=>{}, onProgress=()=>{}, onSubtitle=()=>{} }={}) { this.audioFactory=audioFactory; this.onStatus=onStatus; this.onProgress=onProgress; this.onSubtitle=onSubtitle; this.pending=[]; this.activeClip=null; this.audio=null; this.bgmAudio=null;this.bgmBaseVolume=.35;this.unlocked=false; }
  enqueue(clip){ if(!clip||this.pending.some(item=>item.id===clip.id)||this.activeClip?.id===clip.id)return; this.pending.push(clip); this.pending.sort((a,b)=>priority(b)-priority(a)); }
  enqueueSequence(clips){for(const clip of clips){if(!clip||this.pending.some(item=>item.id===clip.id)||this.activeClip?.id===clip.id)continue;this.pending.push(clip)}}
  async unlock(){ this.unlocked=true; const context=globalThis.AudioContext||globalThis.webkitAudioContext; if(context){const ctx=new context();const oscillator=ctx.createOscillator();const gain=ctx.createGain();gain.gain.value=.00001;oscillator.connect(gain).connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.02);await ctx.resume();setTimeout(()=>ctx.close(),80)} return true; }
  ensureAudio(){if(this.audio)return this.audio;this.audio=this.audioFactory();this.audio.preload='auto';this.audio.addEventListener('timeupdate',()=>{if(this.activeClip)this.onProgress(this.activeClip,this.audio.currentTime)});this.audio.addEventListener('ended',()=>{const done=this.activeClip;this.finishActive();if(done)this.onStatus({status:'ended',clip:done});this.playNext()});this.audio.addEventListener('error',()=>{if(this.activeClip)this.onStatus({status:'failed',clip:this.activeClip})});return this.audio}
  async playNext(){ if(this.activeClip||!this.pending.length)return this.activeClip; const clip=this.pending.shift(); this.activeClip=clip; this.onSubtitle(clip.subtitle??'',clip); this.duckBgm(clip.kind!=='bgm');if(!clip.src){this.onStatus({status:'subtitles',clip});return clip}const audio=this.ensureAudio();audio.src=clip.src;audio.currentTime=0;try{await audio.play();this.onStatus({status:'playing',clip})}catch(error){this.onStatus({status:'failed',clip,error})} return clip; }
  finishActive(){this.activeClip=null;this.duckBgm(false)}
  pause(){this.audio?.pause();if(this.activeClip)this.onStatus({status:'paused',clip:this.activeClip})}
  async resume(){if(this.audio){await this.audio.play();this.onStatus({status:'playing',clip:this.activeClip})}else if(this.activeClip&&!this.activeClip.src){this.onStatus({status:'subtitles',clip:this.activeClip})}}
  rewind(seconds=10,fallbackSeconds=0){
    if(!this.audio)return null;
    const live=Number(this.audio.currentTime);
    const fallback=Number(fallbackSeconds);
    const current=Number.isFinite(live)&&live>0?live:Number.isFinite(fallback)?Math.max(0,fallback):0;
    const target=Math.max(0,current-Math.max(0,Number(seconds)||0));
    this.audio.currentTime=target;
    return target;
  }
  restart(){if(this.audio)this.audio.currentTime=0}
  restore(seconds){if(this.audio&&Number.isFinite(seconds))this.audio.currentTime=Math.max(0,seconds)}
  setBgm(audio,volume=.35){this.bgmAudio=audio;this.bgmBaseVolume=Math.max(0,Math.min(1,volume));if(audio){audio.loop=true;audio.volume=this.bgmBaseVolume}}
  duckBgm(active=true){if(this.bgmAudio)this.bgmAudio.volume=active?Math.min(.12,this.bgmBaseVolume):this.bgmBaseVolume}
  setBgmVolume(volume){this.bgmBaseVolume=Math.max(0,Math.min(1,volume));this.duckBgm(Boolean(this.activeClip&&this.activeClip.kind!=='bgm'))}
  clear(){this.audio?.pause();if(this.audio)this.audio.currentTime=0;this.pending=[];this.finishActive()}
}
