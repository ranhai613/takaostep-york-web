const priority = clip => clip.kind === 'bridge' ? 10000 + (clip.priority ?? 0) : (clip.priority ?? 0);

export class AudioQueue {
  constructor({ audioFactory=()=>new Audio(), onStatus=()=>{}, onProgress=()=>{}, onSubtitle=()=>{} }={}) { this.audioFactory=audioFactory; this.onStatus=onStatus; this.onProgress=onProgress; this.onSubtitle=onSubtitle; this.pending=[]; this.activeClip=null; this.audio=null; this.bgmAudio=null;this.bgmBaseVolume=.35;this.unlocked=false; }
  enqueue(clip){ if(!clip||this.pending.some(item=>item.id===clip.id)||this.activeClip?.id===clip.id)return; this.pending.push(clip); this.pending.sort((a,b)=>priority(b)-priority(a)); }
  async unlock(){ this.unlocked=true; const context=globalThis.AudioContext||globalThis.webkitAudioContext; if(context){const ctx=new context();const oscillator=ctx.createOscillator();const gain=ctx.createGain();gain.gain.value=.00001;oscillator.connect(gain).connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.02);await ctx.resume();setTimeout(()=>ctx.close(),80)} return true; }
  async playNext(){ if(this.activeClip||!this.pending.length)return this.activeClip; const clip=this.pending.shift(); this.activeClip=clip; this.onSubtitle(clip.subtitle??'',clip); this.duckBgm(clip.kind!=='bgm');if(!clip.src){this.onStatus({status:'subtitles',clip});return clip} this.audio=this.audioFactory(clip.src); this.audio.src=clip.src; this.audio.preload='auto'; this.audio.addEventListener('timeupdate',()=>this.onProgress(this.activeClip,this.audio.currentTime)); this.audio.addEventListener('ended',()=>{const done=this.activeClip;this.finishActive();this.onStatus({status:'ended',clip:done});this.playNext()}); this.audio.addEventListener('error',()=>this.onStatus({status:'failed',clip})); try{await this.audio.play();this.onStatus({status:'playing',clip})}catch(error){this.onStatus({status:'failed',clip,error})} return clip; }
  finishActive(){this.activeClip=null;this.audio=null;this.duckBgm(false)}
  pause(){this.audio?.pause();if(this.activeClip)this.onStatus({status:'paused',clip:this.activeClip})}
  async resume(){if(this.audio){await this.audio.play();this.onStatus({status:'playing',clip:this.activeClip})}else if(this.activeClip&&!this.activeClip.src){this.onStatus({status:'subtitles',clip:this.activeClip})}}
  rewind(seconds=10){if(this.audio)this.audio.currentTime=Math.max(0,this.audio.currentTime-seconds)}
  restart(){if(this.audio)this.audio.currentTime=0}
  restore(seconds){if(this.audio&&Number.isFinite(seconds))this.audio.currentTime=Math.max(0,seconds)}
  setBgm(audio,volume=.35){this.bgmAudio=audio;this.bgmBaseVolume=Math.max(0,Math.min(1,volume));if(audio){audio.loop=true;audio.volume=this.bgmBaseVolume}}
  duckBgm(active=true){if(this.bgmAudio)this.bgmAudio.volume=active?Math.min(.12,this.bgmBaseVolume):this.bgmBaseVolume}
  setBgmVolume(volume){this.bgmBaseVolume=Math.max(0,Math.min(1,volume));this.duckBgm(Boolean(this.activeClip&&this.activeClip.kind!=='bgm'))}
  clear(){this.audio?.pause();this.pending=[];this.finishActive()}
}
