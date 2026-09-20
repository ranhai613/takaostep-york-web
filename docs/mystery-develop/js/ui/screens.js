import { escapeHtml } from './renderer.js';

const button = (id,label,kind='primary') => `<button id="${id}" class="${kind}">${escapeHtml(label)}</button>`;
const progress = (index,total=4) => `<div class="progress-dots" aria-label="${index} / ${total} 地点完了">${Array.from({length:total},(_,i)=>`<span class="${i<index?'done':''}"></span>`).join('')}</div>`;
const formatPuzzleText = value => escapeHtml(value).replace(/\*\*(.+?)\*\*/gu,'<strong>$1</strong>').replace(/\n/gu,'<br>');

export function showPreparation(renderer,{hasSaved=false,onContinue,onNew,onReady}){
  renderer.render(`<section class="card hero"><p class="eyebrow">FIELD TERMINAL / 00</p><h1>高尾に残された<br>星間信号を追え</h1><p class="lead">約20分の歩行と謎解きを含む、30〜40分程度の屋外体験です。</p>${hasSaved?`<div class="actions inline">${button('continue-game','続きから')}${button('new-game','新しく始める','secondary')}</div>`:`<ul class="checklist"><li><label><input type="checkbox">画面をつけたまま進み、歩行中は画面を注視しません</label></li><li><label><input type="checkbox">両耳を塞がず、周囲の音が聞こえる音量にします</label></li><li><label><input type="checkbox">謎や地図の操作は、安全な場所で立ち止まって行います</label></li><li><label><input type="checkbox">位置情報は到着判定中だけ使い、座標や履歴を保存・送信しないことを確認しました</label></li></ul><div class="actions">${button('prepare-ready','準備して通信を開く')}</div>`}</section>`);
  if(hasSaved){document.querySelector('#continue-game').addEventListener('click',onContinue);document.querySelector('#new-game').addEventListener('click',onNew)}else{const checks=[...document.querySelectorAll('.checklist input')],ready=document.querySelector('#prepare-ready');ready.disabled=true;checks.forEach(check=>check.addEventListener('change',()=>ready.disabled=!checks.every(item=>item.checked)));ready.addEventListener('click',onReady)}
}

export function showIntro(renderer,{step,clip,onAudioTest,onAudio,onSubtitle,onNext}){
  const scenes={s01:{tag:'TERMINAL FOUND / 01',title:'未知の端末を発見',body:'画面に微弱な信号が灯った。通信を受ける前に、音が出るか確認できます。'},s02:{tag:'INCOMING CALL / 02',title:'着信：UNKNOWN',body:'長い眠りから目覚めた誰かが、あなたへ接続しようとしている。'},s03:{tag:'PILOT MIRA / 03',title:'ミラからの依頼',body:clip.subtitle}};const scene=scenes[step]??scenes.s01;
  const audioControls=step==='s03'?`<div class="actions inline">${button('intro-play','通信を再生','secondary')}${button('intro-pause','一時停止','secondary')}${button('intro-rewind','10秒戻す','secondary')}${button('intro-restart','最初から','secondary')}</div>`:'';
  renderer.render(`<section class="card hero"><p class="eyebrow">${scene.tag}</p><h1>${scene.title}</h1>${step==='s03'?`<div class="subtitle">${escapeHtml(scene.body)}</div>${audioControls}<p class="objective"><strong>最初の目的：</strong>第一観測点へ向かい、文字パーツを回収する</p>`:`<p class="lead">${escapeHtml(scene.body)}</p>`}<div class="actions">${step==='s01'?button('audio-test','確認音を再生')+button('subtitle-mode','字幕のみで進む','secondary'):''}${button('intro-next',step==='s03'?'第一観測点へ出発':'通信を続ける')}</div></section>`);
  document.querySelector('#audio-test')?.addEventListener('click',onAudioTest);document.querySelector('#intro-play')?.addEventListener('click',()=>onAudio('play'));document.querySelector('#intro-pause')?.addEventListener('click',()=>onAudio('pause'));document.querySelector('#intro-rewind')?.addEventListener('click',()=>onAudio('rewind'));document.querySelector('#intro-restart')?.addEventListener('click',()=>onAudio('restart'));document.querySelector('#subtitle-mode')?.addEventListener('click',onSubtitle);document.querySelector('#intro-next').addEventListener('click',onNext);
}

export function showTravel(renderer,{spot,index,status='位置情報を確認できます',subtitle='',inventory,onArrive,onLocation,onAudio}){
  renderer.render(`<section><div class="card"><p class="eyebrow">TARGET ${String(index).padStart(2,'0')} / 04</p><h1>${escapeHtml(spot.title)}</h1>${progress(index-1)}<p class="objective">${escapeHtml(spot.directionText)}</p><p><strong>安全：</strong>${escapeHtml(spot.safeStopText)}</p>${subtitle?`<div class="subtitle">${escapeHtml(subtitle)}</div>`:''}<div class="actions inline">${button('audio-play','通信を再生','secondary')}${button('audio-pause','一時停止','secondary')}${button('audio-rewind','10秒戻す','secondary')}${button('audio-restart','最初から','secondary')}</div><div class="status-line"><span class="status-dot"></span><span id="location-status">${escapeHtml(status)}</span></div>${button('location-start','現在地で自動判定','secondary')}<div id="map" aria-label="現在の目的地点の地図"></div>${button('manual-arrival','この地点に到着した','arrival-button')}<h2>回収パーツ</h2>${inventory}</div></section>`);
  document.querySelector('#manual-arrival').addEventListener('click',onArrive);document.querySelector('#location-start').addEventListener('click',onLocation);document.querySelector('#audio-play').addEventListener('click',()=>onAudio('play'));document.querySelector('#audio-pause').addEventListener('click',()=>onAudio('pause'));document.querySelector('#audio-rewind').addEventListener('click',()=>onAudio('rewind'));document.querySelector('#audio-restart').addEventListener('click',()=>onAudio('restart'));
}

export function showPuzzleBriefing(renderer,{puzzle,clip,onAudio,onContinue}){
  const briefingImage=puzzle.briefingImage?`<img class="puzzle-image" src="${escapeHtml(puzzle.briefingImage)}" alt="${escapeHtml(puzzle.altText)}">`:'';
  renderer.render(`<section class="card hero"><p class="eyebrow">INCOMING MESSAGE / PUZZLE ${String(puzzle.order).padStart(2,'0')}</p><h1>ミラからの導入通信</h1><p><strong>安全な場所で立ち止まって確認してください。</strong></p><div class="subtitle">${escapeHtml(clip.subtitle)}</div>${briefingImage}<div class="actions inline">${button('briefing-play','通信を再生','secondary')}${button('briefing-pause','一時停止','secondary')}${button('briefing-rewind','10秒戻す','secondary')}${button('briefing-restart','最初から','secondary')}</div><div class="actions">${button('open-puzzle','字幕を確認して謎を開く')}</div></section>`);
  document.querySelector('#briefing-play').addEventListener('click',()=>onAudio('play'));
  document.querySelector('#briefing-pause').addEventListener('click',()=>onAudio('pause'));
  document.querySelector('#briefing-rewind').addEventListener('click',()=>onAudio('rewind'));
  document.querySelector('#briefing-restart').addEventListener('click',()=>onAudio('restart'));
  document.querySelector('#open-puzzle').addEventListener('click',onContinue);
}

export function showPuzzle(renderer,{puzzle,hintCount=0,inventory,onSubmit,onHint,onZoom}){
  const image=puzzle.image?`<button id="zoom-image" class="secondary" aria-label="問題画像を拡大"><img class="puzzle-image zoomable" src="${escapeHtml(puzzle.image)}" alt="${escapeHtml(puzzle.altText)}"></button>`:'';
  renderer.render(`<section class="card"><p class="eyebrow">PUZZLE ${String(puzzle.order).padStart(2,'0')}</p><h1>${escapeHtml(puzzle.id.toUpperCase())}</h1><p><strong>安全な場所で立ち止まって操作してください。</strong></p><p class="lead puzzle-prompt">${formatPuzzleText(puzzle.prompt)}</p>${image}<form id="answer-form" class="answer-form"><label for="answer">回答</label><input id="answer" name="answer" autocomplete="off" autocapitalize="characters" required><button class="primary" type="submit">回答を送信</button></form><p id="answer-feedback" class="feedback" role="alert"></p><div class="hints">${puzzle.hints.slice(0,hintCount).map((hint,i)=>`<div class="hint"><strong>ヒント${i+1}</strong><br>${escapeHtml(hint)}</div>`).join('')}</div>${hintCount<3?button('show-hint',`ヒント${hintCount+1}を見る`,'secondary'):''}<h2>回収パーツ</h2>${inventory}</section>`);
  document.querySelector('#answer-form').addEventListener('submit',event=>{event.preventDefault();onSubmit(new FormData(event.currentTarget).get('answer'),document.querySelector('#answer-feedback'))});document.querySelector('#show-hint')?.addEventListener('click',onHint);document.querySelector('#zoom-image')?.addEventListener('click',onZoom);
}

export function showFinal(renderer,{puzzle,subtitle='',order,selected,inventory,onSelect,onSubmit,onHint,hintCount=0}){
  renderer.render(`<section class="card hero"><p class="eyebrow">FINAL AUTHENTICATION</p><h1>登録操縦士を認証</h1>${subtitle?`<div class="subtitle">${escapeHtml(subtitle)}</div>`:''}<p class="puzzle-prompt">${escapeHtml(puzzle.prompt).replace(/\n/gu,'<br>')}</p><p class="muted">1文字目を選び、次に入れ替える文字を選んでください。現在の並びは表示のみで、入れ替えごとの読み上げは行いません。</p><div class="reorder" aria-label="現在の文字順">${order.map((letter,index)=>`<button class="letter-tile" data-index="${index}" aria-pressed="${selected===index}"><span class="sr-only">${index+1}番目、</span><span class="letter-value">${escapeHtml(letter)}</span></button>`).join('')}</div><p class="objective">現在の並び：<strong id="current-letter-order">${order.join(' ・ ')}</strong></p><p id="answer-feedback" class="feedback" role="alert"></p><div class="hints">${puzzle.hints.slice(0,hintCount).map((hint,i)=>`<div class="hint"><strong>ヒント${i+1}</strong><br>${escapeHtml(hint)}</div>`).join('')}</div><div class="actions">${button('final-submit','この並びで認証')}${hintCount<3?button('show-hint',`ヒント${hintCount+1}を見る`,'secondary'):''}</div><h2>回収パーツ</h2>${inventory}</section>`);
  const tiles=[...document.querySelectorAll('.letter-tile')];
  const updateReorder=next=>{if(!next)return;tiles.forEach((tile,index)=>{tile.setAttribute('aria-pressed',String(next.selected===index));tile.querySelector('.letter-value').textContent=next.order[index]});document.querySelector('#current-letter-order').textContent=next.order.join(' ・ ')};
  tiles.forEach(tile=>tile.addEventListener('click',()=>updateReorder(onSelect(Number(tile.dataset.index)))));document.querySelector('#final-submit').addEventListener('click',()=>onSubmit(document.querySelector('#answer-feedback')));document.querySelector('#show-hint')?.addEventListener('click',onHint);
}

export function showFatal(renderer,title,detail,onRetry){renderer.render(`<section class="card hero"><p class="eyebrow">CONNECTION ERROR</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p><div class="actions">${button('retry','再試行')}</div></section>`);document.querySelector('#retry').addEventListener('click',onRetry)}
export function showAssetFailure(renderer,result,onRetry){showFatal(renderer,'必須素材を準備できませんでした',`${result.requiredFailed.length}件の素材が未取得です。通信環境を確認して再試行してください。`,onRetry)}
export function showDevelopmentCleanupFailure(renderer,result,onRetry){
  const detail=result.errors.map(error=>`${error.code}: ${error.message}`).join(' / ');
  showFatal(renderer,'開発用キャッシュを整理できませんでした',`古い表示のまま起動しないため停止しました。${detail}`,onRetry);
}
