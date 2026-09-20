const EARTH_RADIUS_M = 6371008.8;
const radians = degrees => degrees * Math.PI / 180;

export function distanceMeters(a, b) {
  const lat1=radians(a.lat), lat2=radians(b.lat), dLat=lat2-lat1, dLng=radians(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1,Math.sqrt(h)));
}

export function evaluatePosition(position, spot) {
  const distance = distanceMeters({lat:position.coords.latitude,lng:position.coords.longitude},spot);
  const accuracy = Number(position.coords.accuracy) || 0;
  return { spotId:spot.id, lat:position.coords.latitude, lng:position.coords.longitude, distanceM:distance, accuracyM:accuracy, accuracyWarning:accuracy > Math.max(spot.radiusM,100), arrived:distance <= spot.radiusM };
}

export class LocationWatcher {
  constructor({ geolocation=globalThis.navigator?.geolocation, onPosition=()=>{}, onStatus=()=>{} }={}) { this.geolocation=geolocation; this.onPosition=onPosition; this.onStatus=onStatus; this.watchId=null; this.spot=null; }
  start(spot) {
    this.stop(); this.spot=spot;
    if (!this.geolocation) { this.onStatus({status:'unsupported'}); return false; }
    this.onStatus({status:'requesting'});
    this.watchId=this.geolocation.watchPosition(position=>{
      const result=evaluatePosition(position,this.spot); this.onPosition(result); this.onStatus({status:result.accuracyWarning?'low-accuracy':'tracking',...result});
    },error=>{
      const statuses={1:'permission-denied',2:'unavailable',3:'timeout'}; this.onStatus({status:statuses[error.code]??'error',message:error.message});
    },{enableHighAccuracy:true,maximumAge:5000,timeout:12000});
    return true;
  }
  stop(){ if(this.watchId!==null&&this.geolocation) this.geolocation.clearWatch(this.watchId); this.watchId=null; this.spot=null; }
}
