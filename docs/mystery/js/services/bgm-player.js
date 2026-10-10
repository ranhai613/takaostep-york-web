import { BGM_SOURCES } from '../core/bgm-flow.js';

const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const createContext=()=>{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;return Context?new Context():null};

export class BgmPlayer {
  constructor({audioFactory=()=>new Audio(),contextFactory=createContext,fadeMs=300,now=()=>performance.now(),setTimer=(callback,delay)=>globalThis.setTimeout(callback,delay),clearTimer=id=>globalThis.clearTimeout(id),onError=()=>{}}={}){
    this.audio=audioFactory();this.audio.preload='auto';this.audio.loop=true;this.audio.volume=0;
    this.contextFactory=contextFactory;this.fadeMs=Math.max(0,fadeMs);this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.onError=onError;
    this.context=null;this.fadeGain=null;this.volumeGain=null;this.graphCreated=false;
    this._volume=.35;this.level=0;this.fade=null;this.revision=0;
    this.currentTrack=null;this.requestedTrack=null;this.loadedTrack=null;
    this.transitioning=false;this.transitionPromise=Promise.resolve();this.mediaUnlocked=false;this.primingPromise=null;
  }

  get loop(){return this.audio.loop}
  set loop(value){this.audio.loop=Boolean(value)}
  get volume(){return this._volume}
  set volume(value){
    this._volume=clamp(value);
    if(this.volumeGain){
      const time=this.context.currentTime;
      this.volumeGain.gain.cancelScheduledValues(time);
      this.volumeGain.gain.setTargetAtTime(this._volume,time,.04);
    }else this.audio.volume=this._volume*this.fadeLevel();
  }

  ensureGraph(){
    if(this.graphCreated)return;
    this.graphCreated=true;
    const context=this.contextFactory();
    if(!context)return;
    // GainNode also controls volume on mobile browsers that ignore media.volume.
    const source=context.createMediaElementSource(this.audio);
    const fadeGain=context.createGain(),volumeGain=context.createGain();
    fadeGain.gain.value=this.fadeLevel();volumeGain.gain.value=this._volume;
    source.connect(fadeGain).connect(volumeGain).connect(context.destination);
    this.context=context;this.fadeGain=fadeGain;this.volumeGain=volumeGain;this.audio.volume=1;
  }

  unlock(){
    try{this.ensureGraph();this.context?.resume().catch(error=>this.reportError(error))}catch(error){this.reportError(error)}
    if(this.requestedTrack){
      if(!this.transitioning&&this.audio.paused&&this.currentTrack===this.requestedTrack){
        return this.runTransition(this.startCurrent(this.revision),this.revision);
      }
      return this.transitionPromise;
    }
    if(this.mediaUnlocked||this.primingPromise)return this.primingPromise??Promise.resolve();
    // Prime this same media element inside a user gesture, without audible music.
    this.audio.src=BGM_SOURCES.ki;this.loadedTrack='ki';this.applyLevel(0);
    const revision=this.revision;
    let playback;
    try{playback=this.audio.play()}catch(error){this.reportError(error);return Promise.resolve()}
    this.primingPromise=Promise.resolve(playback).then(()=>{
      this.mediaUnlocked=true;
      if(this.revision===revision&&!this.requestedTrack)this.audio.pause();
    }).catch(error=>{if(this.revision===revision)this.reportError(error)}).finally(()=>{this.primingPromise=null});
    return this.primingPromise;
  }

  switchTo(track){
    if(track!==null&&!Object.hasOwn(BGM_SOURCES,track))throw new RangeError(`Unknown BGM: ${track}`);
    if(track===this.requestedTrack)return this.transitionPromise;
    this.requestedTrack=track;
    const revision=++this.revision;
    this.cancelFade();
    return this.runTransition(this.changeTrack(track,revision),revision);
  }

  runTransition(promise,revision){
    this.transitioning=true;
    this.transitionPromise=promise.finally(()=>{if(this.revision===revision)this.transitioning=false});
    return this.transitionPromise;
  }

  async changeTrack(track,revision){
    if(track&&track===this.currentTrack)return this.startCurrent(revision);
    if(!this.audio.paused&&this.fadeLevel()>0){
      if(!await this.fadeTo(0)||revision!==this.revision)return;
    }else this.applyLevel(0);
    if(revision!==this.revision)return;
    this.audio.pause();this.currentTrack=null;
    if(!track){this.audio.currentTime=0;return}
    if(this.loadedTrack!==track){this.audio.src=BGM_SOURCES[track];this.loadedTrack=track}
    this.audio.currentTime=0;this.currentTrack=track;
    await this.startCurrent(revision);
  }

  async startCurrent(revision){
    try{
      await this.audio.play();
      if(revision!==this.revision)return;
      this.mediaUnlocked=true;
      await this.fadeTo(1);
    }catch(error){if(revision===this.revision){this.applyLevel(0);this.reportError(error)}}
  }

  fadeLevel(){
    if(!this.fade)return this.level;
    const progress=Math.max(0,Math.min(1,(this.now()-this.fade.started)/this.fadeMs));
    return this.fade.from+(this.fade.to-this.fade.from)*progress;
  }

  applyLevel(value){
    this.level=clamp(value);
    if(this.fadeGain){
      const time=this.context.currentTime;
      this.fadeGain.gain.cancelScheduledValues(time);
      this.fadeGain.gain.setValueAtTime(this.level,time);
    }else this.audio.volume=this.level*this._volume;
  }

  cancelFade(){
    if(!this.fade)return;
    const level=this.fadeLevel(),fade=this.fade;
    this.clearTimer(fade.timer);this.fade=null;this.applyLevel(level);fade.resolve(false);
  }

  fadeTo(target){
    this.cancelFade();
    if(this.fadeMs===0){this.applyLevel(target);return Promise.resolve(true)}
    const from=this.level;
    return new Promise(resolve=>{
      const fade={from,to:target,started:this.now(),resolve,timer:null};this.fade=fade;
      const finish=()=>{if(this.fade!==fade)return;this.fade=null;this.applyLevel(target);resolve(true)};
      if(this.fadeGain){
        const time=this.context.currentTime;
        this.fadeGain.gain.cancelScheduledValues(time);
        this.fadeGain.gain.setValueAtTime(from,time);
        this.fadeGain.gain.linearRampToValueAtTime(target,time+this.fadeMs/1000);
        fade.timer=this.setTimer(finish,this.fadeMs);
      }else{
        const tick=()=>{
          if(this.fade!==fade)return;
          const elapsed=this.now()-fade.started;
          if(elapsed>=this.fadeMs){finish();return}
          this.audio.volume=this.fadeLevel()*this._volume;
          fade.timer=this.setTimer(tick,Math.min(16,this.fadeMs-elapsed));
        };
        tick();
      }
    });
  }

  reportError(error){if(!['NotAllowedError','AbortError'].includes(error?.name))this.onError(error)}
}
