export function validateRoutes(routes){
  if(routes?.type!=='FeatureCollection'||!Array.isArray(routes.features))return ['routes must be a FeatureCollection'];
  const errors=[];
  const ids=routes.features.map(feature=>feature?.id);
  if(ids.length!==4||new Set(ids).size!==4||![1,2,3,4].every(id=>ids.includes(id)))errors.push('routes must have unique numeric IDs 1–4');
  for(const feature of routes.features){
    const geometry=feature?.geometry;
    if(feature?.type!=='Feature'||geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2){errors.push(`route ${feature?.id} must be a LineString with at least two positions`);continue}
    for(const point of geometry.coordinates){
      if(!Array.isArray(point)||point.length<2||point.length>3||!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>90)errors.push(`route ${feature.id} has an invalid longitude/latitude position`);
    }
  }
  return errors;
}

export function getRouteForSpot(routes,spot,routeMode='primary'){
  if(!routes||routeMode==='alternate'&&spot.order===4)return null;
  const feature=routes.features.find(item=>item.id===spot.order);
  if(!feature)return null;
  const coordinates=feature.geometry.coordinates.map(point=>[...point]);
  const distanceSquared=point=>(point[0]-spot.lng)**2*Math.cos(spot.lat*Math.PI/180)**2+(point[1]-spot.lat)**2;
  if(distanceSquared(coordinates[0])<distanceSquared(coordinates.at(-1)))coordinates.reverse();
  return {...feature,geometry:{...feature.geometry,coordinates}};
}
