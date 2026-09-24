import { escapeHtml, subtitlePanel } from './renderer.js';

const button = (id,label,kind='primary') => `<button id="${id}" class="${kind}">${escapeHtml(label)}</button>`;
const progress = (index,total=4) => `<div class="progress-dots" aria-label="${index} / ${total} 地点完了">${Array.from({length:total},(_,i)=>`<span class="${i<index?'done':''}"></span>`).join('')}</div>`;
const formatPuzzleText = value => escapeHtml(value).replace(/\*\*(.+?)\*\*/gu,'<strong>$1</strong>').replace(/\n/gu,'<br>');

export function showDevicePickup(renderer,{onPickup,onTap}){
  renderer.render(`<section id="device-pickup" class="device-pickup" aria-labelledby="pickup-title"><p class="eyebrow">SIGNAL DETECTED</p><h1 id="pickup-title" class="sr-only">地面に落ちているスマートフォンを拾う</h1><button id="pickup-device" class="pickup-target" type="button" aria-label="スマートフォンを拾う"><span class="pickup-phone" aria-hidden="true"><span class="pickup-speaker"></span><span class="pickup-camera"></span><span class="pickup-screen"><span class="pickup-signal">✦</span><span class="pickup-line"></span><span class="pickup-line short"></span></span></span><span class="pickup-tap" aria-hidden="true">TAP!</span></button><p class="pickup-caption">微かな光を放つ端末が落ちている</p></section>`);
  const section=document.querySelector('#device-pickup'),target=document.querySelector('#pickup-device');
  if(getComputedStyle(section).display!=='grid'&&!document.querySelector('link[data-pickup-style-recovery]')){const link=document.createElement('link');link.rel='stylesheet';link.href=`./styles/app.css?refresh=${Date.now()}`;link.dataset.pickupStyleRecovery='true';document.head.append(link)}
  target.addEventListener('click',()=>{target.disabled=true;onTap?.();section.classList.add('is-picking-up');renderer.announce('端末を拾いました');const delay=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?80:900;setTimeout(()=>onPickup(),delay)},{once:true});
}

export function showPreparation(renderer,{hasSaved=false,onContinue,onNew,onReady}){
  renderer.render(`<section class="card hero"><p class="eyebrow">FIELD TERMINAL / 00</p><h1>宇宙からの<br>漂流者</h1><p class="lead">ご参加いただきありがとうございます。本サイトは約20分の歩行と謎解きを含む、30〜40分程度の屋外体験です。</p>${hasSaved?`<div class="actions inline">${button('continue-game','続きから')}${button('new-game','新しく始める','secondary')}</div>`:`<ul class="checklist"><li><label><input type="checkbox">画面をつけたまま進み、歩行中は画面を注視しません</label></li><li><label><input type="checkbox">両耳を塞がず、周囲の音が聞こえる音量にします</label></li><li><label><input type="checkbox">謎や地図の操作は、安全な場所で立ち止まって行います</label></li><li><label><input type="checkbox">位置情報は到着判定中だけ使い、座標や履歴を保存・送信しないことを確認しました</label></li></ul><div class="actions">${button('prepare-ready','準備して通信を開く')}</div>`}</section>`);
  if(hasSaved){document.querySelector('#continue-game').addEventListener('click',onContinue);document.querySelector('#new-game').addEventListener('click',onNew)}else{const checks=[...document.querySelectorAll('.checklist input')],ready=document.querySelector('#prepare-ready');ready.disabled=true;checks.forEach(check=>check.addEventListener('change',()=>ready.disabled=!checks.every(item=>item.checked)));ready.addEventListener('click',onReady)}
}

export function showIncomingCall(renderer,{ringAvailable=false,onAnswer,onRingReplay}){
  renderer.render(`<section class="incoming-call" aria-labelledby="caller-title"><div class="incoming-phone"><div class="incoming-status" aria-hidden="true"><span>✦ MIRA SIGNAL</span><span>▮▮▮</span></div><div class="incoming-caller"><p class="incoming-kicker">INCOMING CALL</p><div class="incoming-avatar" aria-hidden="true">✦</div><h1 id="caller-title">UNKNOWN</h1><p class="incoming-description">宇宙端末への着信</p><span class="incoming-ringing">着信中<span aria-hidden="true">…</span></span></div><div class="incoming-actions"><button id="answer-call" class="answer-call" type="button"><span class="answer-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 6.9 6.9l1.6-1.9a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.7 2Z"/></svg></span><span>通話開始</span></button>${ringAvailable?button('ring-replay','着信音を再生','secondary'):''}</div></div></section>`);
  document.querySelector('#answer-call').addEventListener('click',onAnswer);
  document.querySelector('#ring-replay')?.addEventListener('click',onRingReplay);
}

export function showIntro(renderer,{clip,onNext}){
  renderer.render(`<section class="card hero"><p class="eyebrow">PILOT MIRA / 03</p><h1>ミラからの依頼</h1>${subtitlePanel(clip.subtitle)}<p class="objective"><strong>最初の目的：</strong>第一観測点へ向かい、散らばったパーツを回収する</p><div class="actions">${button('intro-next','第一観測点へ出発')}</div></section>`);
  document.querySelector('#intro-next').addEventListener('click',onNext);
}

export function showTravel(renderer,{spot,index,status='現在地を確認中…',subtitle='',inventory,onArrive,onLocation}){
  renderer.render(`<section><div class="card"><p class="eyebrow">TARGET ${String(index).padStart(2,'0')} / 04</p><h1>${escapeHtml(spot.title)}</h1>${progress(index-1)}<p class="objective">${escapeHtml(spot.directionText)}</p><p><strong>安全：</strong>${escapeHtml(spot.safeStopText)}</p>${subtitlePanel(subtitle)}<div class="status-line"><span class="status-dot"></span><span id="location-status">${escapeHtml(status)}</span></div><div id="map" aria-label="現在の目的地点の地図"></div><details class="location-fallback"><summary>位置情報が上手く動かない場合</summary><p>目的地点に実際に到着し、安全な場所で立ち止まっている場合だけ、手動で進めてください。</p><div class="fallback-actions">${button('location-start','現在地を再取得','secondary')}${button('manual-arrival','この地点に到着した','secondary')}</div></details><h2>回収パーツ</h2>${inventory}</div></section>`);
  document.querySelector('#manual-arrival').addEventListener('click',onArrive);document.querySelector('#location-start').addEventListener('click',onLocation);
}

export function showPuzzleBriefing(renderer,{puzzle,clip,onContinue}){
  const briefingImage=puzzle.briefingImage?`<img class="puzzle-image" src="${escapeHtml(puzzle.briefingImage)}" alt="${escapeHtml(puzzle.altText)}">`:'';
  renderer.render(`<section class="card hero"><p class="eyebrow">INCOMING MESSAGE / PUZZLE ${String(puzzle.order).padStart(2,'0')}</p><h1>ミラからの導入通信</h1><p><strong>安全な場所で立ち止まって確認してください。</strong></p>${subtitlePanel(clip.subtitle)}${briefingImage}<div class="actions">${button('open-puzzle','謎を開く')}</div></section>`);
  document.querySelector('#open-puzzle').addEventListener('click',onContinue);
}

export function showPuzzle(renderer,{puzzle,hintCount=0,inventory,onSubmit,onHint,onZoom}){
  const image=puzzle.image?`<button id="zoom-image" class="secondary" aria-label="問題画像を拡大"><img class="puzzle-image zoomable" src="${escapeHtml(puzzle.image)}" alt="${escapeHtml(puzzle.altText)}"></button>`:'';
  renderer.render(`<section class="card"><p class="eyebrow">PUZZLE ${String(puzzle.order).padStart(2,'0')}</p><h1>${escapeHtml(puzzle.id.toUpperCase())}</h1><p><strong>安全な場所で立ち止まって操作してください。</strong></p><p class="lead puzzle-prompt">${formatPuzzleText(puzzle.prompt)}</p>${image}<form id="answer-form" class="answer-form"><label for="answer">回答</label><input id="answer" name="answer" autocomplete="off" autocapitalize="characters" required><button class="primary" type="submit">回答を送信</button></form><p id="answer-feedback" class="feedback" role="alert"></p><div class="hints">${puzzle.hints.slice(0,hintCount).map((hint,i)=>`<div class="hint"><strong>ヒント${i+1}</strong><br>${escapeHtml(hint)}</div>`).join('')}</div>${hintCount<3?button('show-hint',`ヒント${hintCount+1}を見る`,'secondary'):''}<h2>回収パーツ</h2>${inventory}</section>`);
  document.querySelector('#answer-form').addEventListener('submit',event=>{event.preventDefault();onSubmit(new FormData(event.currentTarget).get('answer'),document.querySelector('#answer-feedback'))});document.querySelector('#show-hint')?.addEventListener('click',onHint);document.querySelector('#zoom-image')?.addEventListener('click',onZoom);
}

export function showFinal(renderer,{puzzle,parts,subtitle='',order,selected,inventory,onSelect,onSubmit,onHint,hintCount=0}){
  const partFor=value=>parts.find(part=>part.displayText===value);
  renderer.render(`<section class="card hero"><p class="eyebrow">FINAL AUTHENTICATION</p><h1>登録操縦士を認証</h1>${subtitlePanel(subtitle)}<p class="puzzle-prompt">${escapeHtml(puzzle.prompt).replace(/\n/gu,'<br>')}</p><p class="muted">パーツを1つ選び、次に入れ替えるパーツを選んでください。入れ替え後の形をよく観察してください。</p><div class="reorder" aria-label="船体パーツの接続順">${order.map((value,index)=>{const part=partFor(value);return `<button class="part-tile" data-index="${index}" aria-pressed="${selected===index}" aria-label="${index+1}番目のパーツ。${escapeHtml(part.altText)}"><img src="${escapeHtml(part.image)}" alt=""></button>`}).join('')}</div><p id="answer-feedback" class="feedback" role="alert"></p><div class="hints">${puzzle.hints.slice(0,hintCount).map((hint,i)=>`<div class="hint"><strong>ヒント${i+1}</strong><br>${escapeHtml(hint)}</div>`).join('')}</div><div class="actions">${button('final-submit','この接続順で認証')}${hintCount<3?button('show-hint',`ヒント${hintCount+1}を見る`,'secondary'):''}</div><h2>回収パーツ</h2>${inventory}</section>`);
  const tiles=[...document.querySelectorAll('.part-tile')];
  const updateReorder=next=>{if(!next)return;tiles.forEach((tile,index)=>{const part=partFor(next.order[index]);tile.setAttribute('aria-pressed',String(next.selected===index));tile.setAttribute('aria-label',`${index+1}番目のパーツ。${part.altText}`);tile.querySelector('img').src=part.image})};
  tiles.forEach(tile=>tile.addEventListener('click',()=>updateReorder(onSelect(Number(tile.dataset.index)))));document.querySelector('#final-submit').addEventListener('click',()=>onSubmit(document.querySelector('#answer-feedback')));document.querySelector('#show-hint')?.addEventListener('click',onHint);
}

export function showFatal(renderer,title,detail,onRetry){renderer.render(`<section class="card hero"><p class="eyebrow">CONNECTION ERROR</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p><div class="actions">${button('retry','再試行')}</div></section>`);document.querySelector('#retry').addEventListener('click',onRetry)}
export function showAssetFailure(renderer,result,onRetry){showFatal(renderer,'必須素材を準備できませんでした',`${result.requiredFailed.length}件の素材が未取得です。通信環境を確認して再試行してください。`,onRetry)}
export function showDevelopmentCleanupFailure(renderer,result,onRetry){
  const detail=result.errors.map(error=>`${error.code}: ${error.message}`).join(' / ');
  showFatal(renderer,'開発用キャッシュを整理できませんでした',`古い表示のまま起動しないため停止しました。${detail}`,onRetry);
}
