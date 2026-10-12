import * as T from 'three';
import {BADGES} from '../shared/progression.js';
export function updateBikeBadge(model,id){if(model.userData.badgeId===id)return;const old=model.userData.badge;if(old){old.removeFromParent();old.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}model.userData.badgeId=id;model.userData.badge=null;const badge=BADGES.find(b=>b.id===id);if(!badge)return;
 const group=new T.Group(),material=new T.MeshStandardMaterial({color:badge.color,roughness:.5,metalness:.4}),pole=new T.Mesh(new T.CylinderGeometry(.012,.012,.5,6),new T.MeshStandardMaterial({color:0x565e56,metalness:.6,roughness:.5}));pole.position.y=1.35;group.add(pole);const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(.3,0);shape.lineTo(.16,-.17);shape.lineTo(0,-.17);shape.closePath();const flag=new T.Mesh(new T.ShapeGeometry(shape),material);material.side=T.DoubleSide;flag.position.set(0,1.6,0);group.add(flag);group.position.z=-.82;model.add(group);model.userData.badge=group;
}
