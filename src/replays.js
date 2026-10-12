import {safeStorage} from './storage.js';
export * from '../shared/replay.js';
import {validateReplay,sameReplayContext} from '../shared/replay.js';
export function loadReplays(storage=safeStorage){
 try{const entries=JSON.parse(storage.getItem('moto-replays')||'[]');if(!Array.isArray(entries))return [];return entries.slice(0,6).flatMap(e=>{try{return [validateReplay(e)];}catch{return [];}});}catch{return [];}
}
export function saveReplay(data,storage=safeStorage){
 const replay=validateReplay(data),old=loadReplays(storage),best=old.find(r=>r.source===replay.source&&sameReplayContext(r.context,replay.context));if(best&&best.seconds<=replay.seconds)return best;
 const entries=[replay,...old.filter(r=>!(r.source===replay.source&&sameReplayContext(r.context,replay.context)))].slice(0,6);
 try{storage.setItem('moto-replays',JSON.stringify(entries));}catch{try{storage.setItem('moto-replays',JSON.stringify([replay]));}catch{/* Private/limited storage: racing still works. */}}
 return replay;
}
