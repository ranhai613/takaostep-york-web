const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
export const subtitlePanel = text => text ? `<details class="subtitle-panel"><summary>字幕を確認する</summary><div class="subtitle">${escapeHtml(text)}</div></details>` : '';

export class Renderer {
  constructor({ screen=document.querySelector('#screen'), live=document.querySelector('#live-status'), dialogRoot=document.querySelector('#dialog-root') }={}) { this.screen=screen;this.live=live;this.dialogRoot=dialogRoot;this.screen?.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&['pickup-device','continue-game','prepare-ready','answer-call','intro-next','manual-arrival','open-puzzle','next-section','repair-continue','ending-complete','replay-ending'].includes(button.id))this.playTransitionSound()},true); }
  playTransitionSound(){try{if(!this.transitionAudio){this.transitionAudio=new Audio('./assets/audio/sfx/click_next.mp3');this.transitionAudio.preload='auto'}try{this.transitionAudio.currentTime=0}catch{}const playback=this.transitionAudio.play();playback?.catch(()=>{})}catch{}}
  render(markup,{focus=true}={}){this.screen.setAttribute('aria-busy','false');this.screen.innerHTML=markup;if(focus)this.screen.focus({preventScroll:true});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  announce(message){this.live.textContent='';requestAnimationFrame(()=>{this.live.textContent=message})}
  showDialog({title,body,confirmText='閉じる',cancelText,onConfirm,onCancel,danger=false,transitionSound=false}){
    const dialog=document.createElement('dialog');dialog.innerHTML=`<h2>${escapeHtml(title)}</h2><div>${body}</div><div class="actions inline">${cancelText?`<button class="secondary" value="cancel">${escapeHtml(cancelText)}</button>`:''}<button class="${danger?'danger':'primary'}" value="confirm">${escapeHtml(confirmText)}</button></div>`;this.dialogRoot.append(dialog);if(transitionSound)dialog.querySelector('button[value="confirm"]')?.addEventListener('click',()=>this.playTransitionSound(),{once:true});dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='confirm';dialog.remove();if(confirmed)onConfirm?.();else onCancel?.()});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close('cancel')});dialog.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>dialog.close(button.value)));dialog.showModal();return dialog;
  }
  showConversationLog(entries){
    const body=entries.length?`<ol class="conversation-log">${entries.map(entry=>`<li class="conversation-entry"><p class="conversation-meta">${escapeHtml(entry.label)} · ${entry.kind==='main'?'本編':'移動中の通信'}</p><h3>ミラ</h3><p class="conversation-text">${escapeHtml(entry.text)}</p></li>`).join('')}</ol>`:'<p class="muted">まだ振り返れる会話はありません。</p>';
    const dialog=this.showDialog({title:'会話ログ',body,confirmText:'閉じる',cancelText:''});
    dialog.classList.add('conversation-dialog');
    const heading=dialog.querySelector('h2');
    heading.id='conversation-log-title';heading.tabIndex=-1;
    dialog.setAttribute('aria-labelledby',heading.id);
    heading.focus({preventScroll:true});
    dialog.scrollTop=0;
    dialog.querySelector('div').scrollTop=0;
    return dialog;
  }
  arrivalEffect(){const flash=document.createElement('div');flash.className='scan-flash';flash.setAttribute('aria-hidden','true');document.body.append(flash);setTimeout(()=>flash.remove(),900);this.tone(660,.12);if(globalThis.navigator?.vibrate)navigator.vibrate([80,50,120]);this.announce('目的地点を検知しました');}
  tone(frequency=520,duration=.08){try{const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return false;const context=new AudioContext();const oscillator=context.createOscillator();const gain=context.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.08,context.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+duration);setTimeout(()=>context.close(),(duration+0.1)*1000);return true}catch{return false}}
  inventory(parts,collected){return `<div class="inventory" aria-label="回収した船体パーツ">${parts.map((part,index)=>{const owned=collected.includes(part.id);return `<span class="part ${owned?'owned':''}" aria-label="${index+1}番目のパーツ、${owned?`回収済み。${escapeHtml(part.altText)}`:'未回収'}">${owned?`<img src="${escapeHtml(part.image)}" alt="">`:'?'}</span>`}).join('')}</div>`}
  showPartAcquired(part,puzzle,inventory,onNext){this.render(`<section class="card hero"><p class="eyebrow">SIGNAL RESTORED</p><div class="part part-gain acquired-part"><img src="${escapeHtml(part.image)}" alt="${escapeHtml(part.altText)}"></div><h1>船体パーツを回収</h1><details class="puzzle-explanation"><summary>謎の解説を見る</summary><p>${escapeHtml(puzzle.explanation)}</p></details>${inventory}<div class="actions"><button id="next-section" class="primary">次の信号へ</button></div></section>`);document.querySelector('#next-section').addEventListener('click',onNext);this.announce('船体パーツを回収しました')}
  showRepairSequence(parts,onContinue){
    const positions=[[-135,-135,-58,-58],[135,-135,58,-58],[-135,135,-58,58],[135,135,58,58]];
    const dockStart=600,dockInterval=1800,dockDuration=1250;
    const pieces=parts.map((part,index)=>{const [sx,sy,dx,dy]=positions[index];return `<img class="repair-piece" src="${escapeHtml(part.image)}" alt="" draggable="false" style="--start-x:${sx}px;--start-y:${sy}px;--dock-x:${dx}px;--dock-y:${dy}px;--dock-delay:${dockStart+index*dockInterval}ms;--dock-duration:${dockDuration}ms">`}).join('');
    this.render(`<section id="repair-scene" class="repair-scene is-running" aria-labelledby="repair-title"><p class="eyebrow">FINAL CONNECTION</p><h1 id="repair-title">船体、再起動。</h1><div class="repair-frame" aria-hidden="true"><div class="repair-ring"></div><div class="repair-core">✦</div>${pieces}<div class="repair-wave"></div></div><p class="repair-progress"><strong id="repair-count">0 / 4</strong><span>船体パーツ接続</span></p><p id="repair-status" class="repair-status" role="status">認証成功。パーツを接続しています…</p><div class="repair-signal" aria-hidden="true"><span></span><span></span><span></span><span></span></div><p id="repair-signal-label" class="repair-signal-label">MIRA SIGNAL / WEAK</p><div class="repair-actions"><button id="repair-skip" class="secondary" type="button">演出をスキップ</button><button id="repair-continue" class="primary" type="button" hidden>ミラの通信を開く</button></div></section>`);
    const scene=document.querySelector('#repair-scene'),count=document.querySelector('#repair-count'),status=document.querySelector('#repair-status'),signal=document.querySelector('#repair-signal-label'),skip=document.querySelector('#repair-skip'),next=document.querySelector('#repair-continue');
    const timers=[];
    const clearTimers=()=>timers.splice(0).forEach(clearTimeout);
    const finish=(focus=false)=>{
      if(scene.classList.contains('is-complete'))return;
      clearTimers();
      const moveFocus=focus||document.activeElement===skip;
      scene.classList.remove('is-running');scene.classList.add('is-signal','is-complete');
      count.textContent='4 / 4';status.textContent='船体機能復旧。ミラとの通信が回復しました。';signal.textContent='MIRA SIGNAL / RESTORED';
      skip.hidden=true;next.hidden=false;
      if(moveFocus)next.focus({preventScroll:true});
    };
    skip.addEventListener('click',()=>finish(true));
    next.addEventListener('click',()=>{
      if(next.disabled)return;
      clearTimers();next.disabled=true;
      const continueToEnding=()=>{if(onContinue()===false){next.disabled=false;status.textContent='船体機能復旧。ミラとの通信が回復しました。'}};
      if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){continueToEnding();return}
      status.textContent='帰還通信に接続しています…';
      const whiteout=document.createElement('div');whiteout.className='repair-whiteout';whiteout.setAttribute('aria-hidden','true');document.body.append(whiteout);
      whiteout.addEventListener('animationend',()=>whiteout.remove(),{once:true});
      setTimeout(continueToEnding,2500);
      setTimeout(()=>whiteout.remove(),5300);
    });
    if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){finish();return}
    parts.forEach((_,index)=>timers.push(setTimeout(()=>{count.textContent=`${index+1} / 4`},dockStart+index*dockInterval+dockDuration)));
    timers.push(setTimeout(()=>{scene.classList.add('is-signal');status.textContent='船体機能復旧。通信経路を再接続しています…'},8000));
    timers.push(setTimeout(()=>finish(),10000));
  }
  showEnding(text,onComplete){this.render(`<section class="card hero"><div class="ending-star" aria-hidden="true">✦</div><p class="eyebrow">RETURN SEQUENCE</p><h1>帰還通信</h1>${subtitlePanel(text)}<div class="actions"><button id="ending-complete" class="primary">通信を最後まで確認した</button></div></section>`);document.querySelector('#ending-complete').addEventListener('click',onComplete)}
  showMemorial(parts,onReplay){this.render(`<section class="card hero"><p class="eyebrow">MISSION COMPLETE</p><h1>相棒、任務完了。</h1><p class="lead">MIRAの帰還認証に成功しました。</p>${this.inventory(parts,parts.map(p=>p.id))}<p class="objective"><strong>報酬：</strong>1オークエン<br><span class="muted">※物語上の報酬です。実際の金銭ではありません。</span></p><div class="actions"><button id="replay-ending" class="secondary">エンディングを再視聴</button></div></section>`);document.querySelector('#replay-ending').addEventListener('click',onReplay)}
}

export function formatPartProgress(parts,collectedPartIds){return `${parts.filter(part=>collectedPartIds.includes(part.id)).length}/${parts.length}`}

export { escapeHtml };
