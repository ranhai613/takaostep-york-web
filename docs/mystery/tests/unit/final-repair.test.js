import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../../js/ui/renderer.js';

const parts=['M','I','R','A'].map(id=>({image:`./assets/images/parts/scrap_${id}.png`}));

function showRepair(reducedMotion){
  const listeners=new Map();
  const overlays=[];
  const classes=new Set(['is-running']);
  const scene={classList:{contains:value=>classes.has(value),add:(...values)=>values.forEach(value=>classes.add(value)),remove:(...values)=>values.forEach(value=>classes.delete(value))}};
  const elements={
    '#repair-scene':scene,
    '#repair-count':{textContent:'0 / 4'},
    '#repair-status':{textContent:'認証成功。パーツを接続しています…'},
    '#repair-signal-label':{textContent:'MIRA SIGNAL / WEAK'},
    '#repair-continue':{hidden:true,focused:false,focus(){this.focused=true},addEventListener:(type,handler)=>listeners.set(`continue:${type}`,handler)}
  };
  globalThis.document={
    querySelector:selector=>elements[selector],activeElement:null,
    createElement:()=>({className:'',removed:false,setAttribute(){},addEventListener(){},remove(){this.removed=true}}),
    body:{append:overlay=>overlays.push(overlay)}
  };
  globalThis.matchMedia=()=>({matches:reducedMotion});
  let markup,continued=0;
  const renderer=Object.create(Renderer.prototype);
  renderer.render=value=>{markup=value};
  renderer.showRepairSequence(parts,()=>{continued++});
  return {elements,listeners,classes,markup,overlays,get continued(){return continued}};
}

test('the final repair finishes before fading to the return communication for five seconds', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  try{
    const view=showRepair(false);
    assert.equal((view.markup.match(/class="repair-piece"/gu)??[]).length,4);
    assert.doesNotMatch(view.markup,/repair-skip|演出をスキップ/u);
    t.mock.timers.tick(10000);
    assert.equal(view.classes.has('is-complete'),true);
    assert.equal(view.elements['#repair-count'].textContent,'4 / 4');
    assert.equal(view.elements['#repair-continue'].hidden,false);
    view.listeners.get('continue:click')();
    assert.equal(view.continued,0);
    assert.equal(view.overlays.length,1);
    assert.equal(view.overlays[0].className,'repair-whiteout');
    t.mock.timers.tick(2499);
    assert.equal(view.continued,0);
    t.mock.timers.tick(1);
    assert.equal(view.continued,1);
    t.mock.timers.tick(2800);
    assert.equal(view.overlays[0].removed,true);
  }finally{t.mock.timers.reset();delete globalThis.document;delete globalThis.matchMedia}
});

test('repair parts finish docking after ten seconds', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  try{
    const view=showRepair(false);
    t.mock.timers.tick(9999);
    assert.equal(view.elements['#repair-continue'].hidden,true);
    t.mock.timers.tick(1);
    assert.equal(view.elements['#repair-continue'].hidden,false);
    assert.equal(view.elements['#repair-count'].textContent,'4 / 4');
  }finally{t.mock.timers.reset();delete globalThis.document;delete globalThis.matchMedia}
});

test('reduced motion shows the restored signal without waiting', () => {
  try{
    const view=showRepair(true);
    assert.equal(view.classes.has('is-complete'),true);
    assert.match(view.elements['#repair-status'].textContent,/通信が回復/u);
    assert.equal(view.elements['#repair-continue'].hidden,false);
    view.listeners.get('continue:click')();
    assert.equal(view.continued,1);
    assert.equal(view.overlays.length,0);
  }finally{delete globalThis.document;delete globalThis.matchMedia}
});
