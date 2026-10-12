import {trackById,PHYSICS_VERSION} from './tracks.js';
export const RESULT_MODES=['solo','timeattack','race','open','arcade','courier','elimination','totem','stunt'];
export const BADGES=[
 {id:'camp',name:'Следопыт лагеря',description:'Пройди шесть колец лагерной разминки.',color:0x81caa4},
 {id:'clean',name:'Чистая линия',description:'Заверши круг без ударов.',color:0xa2dcbf},
 {id:'courier',name:'Хранитель груза',description:'Доставь реликвию в курьере.',color:0xbdaeef},
 {id:'team',name:'Плечом к плечу',description:'Передай груз или спаси товарища.',color:0x79c5f0},
 {id:'style',name:'На грани сцепления',description:'Набери 100 очков чистого стиля.',color:0xf3ce83},
 {id:'stunt',name:'Точный баланс',description:'Пройди стант без падений.',color:0xeaa290},
 {id:'winner',name:'Первый у ворот',description:'Победи в гонке, выбывании или борьбе за тотем.',color:0xf2dfa0}
];
export function resultSummary(s,mode,weather,{won=false,challengeId='',level='',variant='standard',fieldSize=s.fieldSize||1,seconds=null}={}){
 const a=s.adventure||{},style=s.style||s.arcade?.style;
 return {mode,bike:s.bike,trackId:s.trackId||'rift',trackRevision:s.trackRevision||trackById(s.trackId).revision,physicsVersion:PHYSICS_VERSION,weather,setup:s.setup||'stock',variant,fieldSize,challengeId,level,seconds:seconds??s.resultSeconds??s.raceTime+(s.totalPenalty||0),laps:s.completed||0,hits:s.hits||0,points:mode==='stunt'?style?.points||0:mode==='arcade'?s.arcade?.score||0:a.points||0,style:style?.points||0,passes:a.passes||0,rescues:a.rescues||0,fuelGiven:a.fuelGiven||0,won:!!won,status:s.health===0?'crashed':a.eliminated?'eliminated':'finished'};
}
export function earnedBadges(r){return BADGES.filter(b=>({camp:r.mode==='open'&&r.level==='camp-sprint'&&r.status==='finished',clean:r.laps>0&&r.hits===0&&r.status==='finished',courier:r.mode==='courier'&&r.won,team:r.passes>0||r.rescues>0,style:r.style>=100,stunt:r.mode==='stunt'&&r.status==='finished'&&r.hits===0,winner:['race','elimination','totem'].includes(r.mode)&&r.won}[b.id])).map(b=>b.id);}
export function resultHighlight(r){return r.rescues?'Спасение товарища':r.passes?'Точная передача груза':r.style>=100?'Цепочка чистого стиля':r.hits===0&&r.status==='finished'?'Чистый заезд':r.won?'Победный финиш':'Следующая попытка — новая траектория';}
