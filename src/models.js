import * as T from 'three';
import { mat,add,box,ellipsoid,tube,curvedTube,bolt,optimize } from './model-geometry.js';
const rubber=mat(0x161b1d,0,.92);
export { buildBike } from './motorcycles.js';
export function buildOrc(){
  const root=new T.Group(),skin=mat(0x638745,0,.88),armor=mat(0x4f4b47,.75,.48),cloth=mat(0x5c2926),bone=mat(0xe0d6b1);
  ellipsoid(root,0,1.5,0,.55,.62,.34,skin);ellipsoid(root,0,2.18,.06,.32,.34,.28,skin);
  box(root,0,1.05,0,.75,.28,.44,cloth);box(root,0,1.26,.35,.20,.15,.055,armor);
  const legs=[],arms=[];
  for(const x of [-.21,.21]){const leg=new T.Group();leg.position.set(x,.96,0);leg.userData.dynamic=true;root.add(leg);legs.push(leg);tube(leg,[0,0,0],[x*.1,-.61,.07],.16,skin);box(leg,x*.1,-.79,.15,.27,.24,.42,armor);}
  for(const x of [-.62,.62]){const arm=new T.Group();arm.position.set(x,1.67,0);arm.userData.dynamic=true;root.add(arm);arms.push(arm);ellipsoid(root,x,1.79,0,.28,.20,.33,armor);tube(arm,[0,0,0],[x*.3,-.65,.18],.17,skin);ellipsoid(arm,x*.3,-.67,.18,.18,.19,.16,skin);}
  for(const x of [-.10,.10]){ellipsoid(root,x,2.24,.32,.053,.039,.025,mat(0xefb439));const tooth=add(root,new T.ConeGeometry(.047,.16,8),bone,x,2.06,.34);tooth.rotation.x=-.25;}
  ellipsoid(root,0,2.05,.29,.18,.095,.08,skin);
  tube(arms[1],[.20,-.74,.15],[.40,.14,.26],.052,mat(0x60472c));ellipsoid(arms[1],.42,.19,.26,.14,.25,.17,armor);
  for(let i=0;i<4;i++){const spike=add(arms[1],new T.ConeGeometry(.05,.2,6),bone,.42,.15+i*.10,.41);spike.rotation.x=Math.PI/2;}
  // Sculpted facial planes, pointed ears and layered armour silhouette.
  box(root,0,2.16,.30,.17,.15,.105,skin);
  for(const side of [-1,1]){
    const brow=ellipsoid(root,side*.12,2.31,.29,.125,.05,.075,armor);brow.rotation.z=side*.25;
    const ear=add(root,new T.ConeGeometry(.13,.35,12),skin,side*.36,2.24,0);ear.rotation.z=-side*1.05;
    ellipsoid(root,side*.15,2.03,.16,.18,.14,.19,skin);
    for(let j=0;j<3;j++){const spike=add(root,new T.ConeGeometry(.07,.23+j*.06,10),bone,side*(.45+j*.12),1.98+j*.03,0);spike.rotation.z=-side*.35;}
    const arm=arms[side<0?0:1],leg=legs[side<0?0:1];
    for(let j=0;j<3;j++)box(arm,side*.14,-.47+j*.08,.26,.26,.06,.09,armor);
    const plate=box(leg,side*.01,-.40,.21,.23,.36,.07,armor);plate.rotation.x=-.15;
    for(let j=0;j<3;j++)box(root,side*.20,.94,.14+j*.1,.26,.27,.05,cloth);
  }
  tube(root,[-.35,1.8,.28],[.23,1.2,.36],.035,cloth);
  for(let j=0;j<6;j++)box(root,-.25+j*.085,1.04,.24,.05,.09,.025,mat(0xab8650,.7,.4));
  const leather=mat(0x51412e,.05,.89);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){const x=(col-1)*.23;const plate=box(root,x,1.36+row*.15,-.30,.21,.145,.07,leather);plate.rotation.x=-.12;plate.rotation.y=x*.7;bolt(root,x,1.4+row*.15,-.35);}
  for(const side of [-1,1]){const leg=legs[side<0?0:1];ellipsoid(leg,side*.04,-.78,.18,.17,.15,.24,leather);box(leg,side*.04,-.90,.18,.30,.04,.42,rubber);}
  for(const limb of [...legs,...arms])optimize(limb);
  root.userData={legs,arms};optimize(root);return root;
}
