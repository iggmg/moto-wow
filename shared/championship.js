import times from './championship-times.json' with {type:'json'};
import {TRACKS} from './tracks.js';
export const SEASON='rift-2026-rules-8';
export const CHAMPIONSHIP_EVENTS=TRACKS.map(t=>({id:t.id,name:t.name,weather:t.weather,revision:t.revision,laps:1,thresholds:times.thresholds[t.id]}));
export function medalFor(track,bike,seconds){const limit=times.thresholds[track]?.[bike];if(!limit||!Number.isFinite(seconds)||seconds<=0)return null;for(const [medal,points]of [['gold',300],['silver',200],['bronze',100]])if(seconds<=limit[medal])return {medal,points,ratio:seconds/limit.gold};return {medal:'finish',points:0,ratio:seconds/limit.gold};}
export function rankChampionship(rows){let previous=null,place=0;return rows.map((r,i)=>{if(r.points!==previous)place=i+1;previous=r.points;return {...r,place};});}
