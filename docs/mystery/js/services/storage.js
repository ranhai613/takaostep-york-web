import { validatePlayerState } from '../core/content-validator.js';

export const PLAYER_STATE_KEY = 'takaostep:mystery:player-state';

export function createStateStore(storage=globalThis.localStorage, key=PLAYER_STATE_KEY) {
  return {
    key,
    save(state){ const errors=validatePlayerState(state); if(errors.length)throw new Error(`Invalid player state: ${errors.join('; ')}`); storage.setItem(key,JSON.stringify(state)); return state; },
    load(release){
      const raw=storage.getItem(key); if(!raw)return {status:'empty',state:null};
      let state; try{state=JSON.parse(raw)}catch{return {status:'corrupt',state:null,raw}}
      const errors=validatePlayerState(state); if(errors.length)return {status:'corrupt',state:null,raw,errors};
      if(state.releaseId===release.releaseId)return {status:'current',state};
      if((release.compatibleReleaseIds??[]).includes(state.releaseId)){const migrated={...state,releaseId:release.releaseId,updatedAt:new Date().toISOString()};this.save(migrated);return {status:'migrated',state:migrated};}
      return {status:'incompatible',state:null,preserved:state};
    },
    reset(confirmed){if(!confirmed)return false;storage.removeItem(key);return true}
  };
}
