import test from 'node:test';
import assert from 'node:assert/strict';
import { MapView } from '../../js/ui/map-view.js';

function fakeLeaflet(){
  const maps=[];
  const layer=(kind,points,style)=>({kind,points,style,addTo(map){map.layers.push(this);return this},on(){return this},bindPopup(){return this},bindTooltip(){return this},setLatLng(point){this.points=point;return this},getBounds(){return {points:this.points,extend(other){this.extended=other;return this}}}});
  return {maps,map(){const map={layers:[],fits:[],setView(){return this},invalidateSize(){this.resized=true},fitBounds(bounds,options){this.fits.push({bounds,options})},remove(){this.removed=true}};maps.push(map);return map},polyline:(points,style)=>layer('line',points,style),marker:points=>layer('target',points),circle:(points,style)=>layer('radius',points,style),circleMarker:(points,style)=>layer('dot',points,style),tileLayer:()=>layer('tile')};
}
const spot={lat:35.6,lng:139.2,radiusM:45,title:'Target'};
const route={geometry:{coordinates:[[139.1,35.5],[139.15,35.55],[139.2,35.6]]}};
const element={setAttribute(){}};
const flush=()=>new Promise(resolve=>setTimeout(resolve,5));

test('active leg is drawn in longitude/latitude order conversion and GPS does not recenter',async()=>{
  const L=fakeLeaflet(),view=new MapView({L});
  view.mount(element,spot,{},route);await flush();
  const map=L.maps[0],lines=map.layers.filter(layer=>layer.kind==='line');
  assert.equal(lines.length,2);
  assert.deepEqual(lines[1].points,[[35.5,139.1],[35.55,139.15],[35.6,139.2]]);
  assert.ok(lines[0].style.weight>lines[1].style.weight);
  assert.equal(lines[0].style.color,'#ffffff');
  assert.equal(map.fits.length,1);
  view.updatePosition({lat:35.51,lng:139.11});view.updatePosition({lat:35.52,lng:139.12});
  assert.deepEqual(view.positionMarker.points,[35.52,139.12]);assert.equal(map.fits.length,1);
  view.destroy();assert.equal(map.removed,true);assert.deepEqual(view.routeLayers,[]);
});

test('no-route fallback keeps target and radius; changing screens cancels old fitBounds',async()=>{
  const L=fakeLeaflet(),view=new MapView({L});
  view.mount(element,spot,{},route);
  view.mount(element,spot,{},null);await flush();
  assert.equal(L.maps[0].removed,true);assert.equal(L.maps[0].fits.length,0);
  const map=L.maps[1];assert.equal(map.layers.filter(layer=>layer.kind==='line').length,0);
  assert.ok(map.layers.some(layer=>layer.kind==='target'));assert.ok(map.layers.some(layer=>layer.kind==='radius'));
  assert.equal(map.fits.length,0);view.destroy();
});
