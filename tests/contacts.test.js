import test from 'node:test';
import assert from 'node:assert/strict';
import {createRider,stepRider} from '../shared/game.js';
import {stepContacts} from '../shared/contacts.js';
const pair=()=>[Object.assign(createRider(),{x:0,z:0,y:0,yaw:0,speed:20,contactShield:0}),Object.assign(createRider(),{x:0,z:1.2,y:0,yaw:Math.PI,speed:20,contactShield:0})];
test('head-on contacts separate, limit impulse and damage; repeat contact cannot farm damage',()=>{const [a,b]=pair();stepContacts([a,b],5);assert(a.health<100&&b.health<100);assert(a.health>=76);assert(Math.abs(a.contactVZ)<=8);const h=a.health;stepContacts([a,b],5);assert.equal(a.health,h);});
test('friendly room, start shield, airborne separation and low-speed touch avoid damage',()=>{for(const kind of ['friendly','shield','jump','slow']){const [a,b]=pair();if(kind==='shield')a.contactShield=2;if(kind==='jump')b.y=2;if(kind==='slow')a.speed=b.speed=0;stepContacts([a,b],5,{damage:kind!=='friendly'});assert.equal(a.health,100);assert.equal(b.health,100);}});
test('eight overlapping riders remain finite and temporary lateral velocity decays',()=>{const riders=Array.from({length:8},(_,i)=>Object.assign(createRider(),{x:i*.1,z:0,y:0,contactShield:0}));for(let n=0;n<60;n++){stepContacts(riders,n/60,{damage:false});for(const s of riders)stepRider(s,{},1/60,n/60,[]);}for(const s of riders)assert(Number.isFinite(s.x)&&Number.isFinite(s.contactVX));});
