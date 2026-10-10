export class MapView {
  constructor({ L=globalThis.L,onTileError=()=>{} }={}){this.L=L;this.onTileError=onTileError;this.map=null;this.positionMarker=null;this.targetMarker=null;this.radius=null;this.routeLayers=[];this.startMarker=null;this.resizeTimer=null}
  mount(element,spot,mapConfig,route=null){
    this.destroy();
    if(!this.L||!element){this.onTileError('地図を表示できません。方向案内と到着ボタンは利用できます。');return false}
    const map=this.map=this.L.map(element,{zoomControl:true}).setView([spot.lat,spot.lng],mapConfig.zoom??16);
    if(mapConfig.tileUrl){
      const layer=this.L.tileLayer(mapConfig.tileUrl,{attribution:mapConfig.attribution,maxZoom:19});
      layer.on('tileerror',()=>this.onTileError('地図タイルを取得できません。方向案内と到着ボタンで進行できます。'));layer.addTo(map);
    }
    let routeLine;
    if(route){
      const points=route.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
      const outline=this.L.polyline(points,{color:'#ffffff',weight:9,opacity:.95,lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
      routeLine=this.L.polyline(points,{color:'#0b827d',weight:5,opacity:1,lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
      this.routeLayers=[outline,routeLine];
      this.startMarker=this.L.circleMarker(points[0],{radius:6,color:'#ffffff',weight:3,fillColor:'#0b827d',fillOpacity:1}).addTo(map).bindTooltip('出発地点',{permanent:true,direction:'top'});
    }
    this.targetMarker=this.L.marker([spot.lat,spot.lng]).addTo(map).bindPopup(spot.title);
    this.radius=this.L.circle([spot.lat,spot.lng],{radius:spot.radiusM,color:'#54e6d8',fillColor:'#54e6d8',fillOpacity:.12}).addTo(map);
    element.setAttribute('aria-label',route?'目的地へのルートと現在地の地図':'現在の目的地点の地図');
    this.resizeTimer=setTimeout(()=>{
      this.resizeTimer=null;
      if(this.map!==map)return;
      map.invalidateSize();
      if(routeLine)map.fitBounds(routeLine.getBounds().extend(this.radius.getBounds()),{padding:[24,24],maxZoom:17});
    },0);
    return true;
  }
  updatePosition({lat,lng}){if(!this.map||!this.L)return;if(!this.positionMarker)this.positionMarker=this.L.circleMarker([lat,lng],{radius:8,color:'#08111f',weight:3,fillColor:'#ffd166',fillOpacity:1}).addTo(this.map).bindTooltip('現在地');else this.positionMarker.setLatLng([lat,lng])}
  destroy(){if(this.resizeTimer!==null)clearTimeout(this.resizeTimer);if(this.map)this.map.remove();this.map=null;this.positionMarker=null;this.targetMarker=null;this.radius=null;this.routeLayers=[];this.startMarker=null;this.resizeTimer=null}
}
