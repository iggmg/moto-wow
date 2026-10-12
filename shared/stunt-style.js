export function createStuntStyle(){return {points:0,combo:0,lastEarned:-99,airborne:false,airTime:0,startAngle:0,takeoffX:0,manualTime:0,manualDistance:0,awards:[],pending:null};}
function earn(s,type,zone,points){const t=s.style,key=type+'-'+zone;if(t.awards.includes(key))return;t.awards.push(key);t.combo=s.time-t.lastEarned<7?Math.min(4,t.combo+1):1;t.lastEarned=s.time;t.points+=Math.round(points*(1+(t.combo-1)*.25));t.message=type==='flip'?'Переворот и чистая посадка':type==='manual'?'Баланс на одном колесе':'Чистый прыжок';}
export function stepStuntStyle(s,dt){
 const t=s.style||=createStuntStyle();if(s.failed){t.combo=0;t.airborne=false;t.pending=null;return;}
 const contact=s.contacts.some(Boolean),airborne=!contact;
 if(airborne){if(!t.airborne){t.startAngle=s.angle;t.takeoffX=s.x;t.airTime=0;}t.airTime+=dt;}
 else if(t.airborne&&t.airTime>.25){t.pending={ready:s.time+.15,turns:Math.floor((Math.abs(s.angle-t.startAngle)+.3)/(Math.PI*2)),airTime:t.airTime,zone:Math.floor(t.takeoffX/20)};}
 if(t.pending&&s.time>=t.pending.ready){const p=t.pending;t.pending=null;if(contact&&Math.cos(s.angle)>.7&&Math.abs(s.omega)<2.5)earn(s,p.turns?'flip':'jump',p.zone,25+Math.min(3,p.turns)*100+Math.min(30,p.airTime*15));}
 const manual=s.contacts.filter(Boolean).length===1&&Math.abs(s.angle)>.15&&Math.cos(s.angle)>.4&&Math.abs(s.vx)>3;
 if(manual){t.manualTime+=dt;t.manualDistance+=Math.abs(s.vx)*dt;if(t.manualTime>.7&&t.manualDistance>4)earn(s,'manual',Math.floor(s.x/20),20);}else {t.manualTime=0;t.manualDistance=0;}
 t.airborne=airborne;if(s.time-t.lastEarned>7)t.combo=0;
}
