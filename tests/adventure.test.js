import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRider} from '../shared/game.js';
import {createAdventure,initAdventure,adventureAction,stepAdventure} from '../shared/adventure.js';
function pair(mode){const world=createAdventure(mode,'rift'),riders=[1,2].map(id=>Object.assign(initAdventure(createRider('winner'),mode),{id}));return {world,riders};}
test('cargo has one owner; passing requires a nearby live rider and cannot duplicate the relic',()=>{
 const {world,riders}=pair('courier');Object.assign(riders[0],world.cargo);assert(adventureAction(world,riders,1,'pickup',2));assert.equal(world.cargo.ownerId,1);assert.equal(adventureAction(world,riders,2,'pickup',4),false);
 riders[1].x=200;assert.equal(adventureAction(world,riders,1,'pass',4),false);riders[1].x=riders[0].x;riders[1].z=riders[0].z;assert(adventureAction(world,riders,1,'pass',4));assert.equal(world.cargo.ownerId,2);assert.equal(riders.filter(s=>s.cargoCarrier).length,1);assert.equal(adventureAction(world,riders,1,'pass',4),false);
});
test('courier extra trophy and banking finish the team exactly once; death drops cargo',()=>{
 const {world,riders}=pair('courier');Object.assign(riders[0],world.cargo);adventureAction(world,riders,1,'pickup',2);Object.assign(riders[0],world.trophy);assert(adventureAction(world,riders,1,'extra',4));assert.equal(world.cargo.value,2);assert.equal(adventureAction(world,riders,1,'extra',5),false);Object.assign(riders[0],world.bank);assert(adventureAction(world,riders,1,'bank',6));assert.equal(world.score,200);assert(riders.every(s=>s.finished));assert.equal(adventureAction(world,riders,1,'bank',8),false);
 const next=pair('courier');Object.assign(next.riders[0],next.world.cargo);adventureAction(next.world,next.riders,1,'pickup',2);next.riders[0].health=0;stepAdventure(next.world,next.riders,[],.1,4);assert.equal(next.world.cargo.ownerId,null);assert.equal(next.world.finished,false);
});
test('cooperative rescue/fuel sharing consumes resources and has cooldown',()=>{
 const {world,riders}=pair('courier'),[helper,target]=riders;target.health=0;target.finished=true;assert(adventureAction(world,riders,1,'rescue',2));assert.equal(target.health,35);assert.equal(helper.arcade.fuel,85);assert.equal(adventureAction(world,riders,1,'rescue',2),false);target.arcade.fuel=40;assert(adventureAction(world,riders,1,'fuel',12));assert.equal(target.arcade.fuel,60);assert.equal(helper.arcade.fuel,65);
});
test('elimination removes the trailing rider and declares the remaining winner',()=>{
 const {world,riders}=pair('elimination');riders[0].nextGate=5;world.elapsed=44.9;stepAdventure(world,riders,[],.2,45.1);assert.equal(riders[1].adventure.eliminated,true);assert.equal(world.finished,true);assert.deepEqual(world.winners,[1]);
});
test('totem points require banking, rotate objectives and a hit drops the carried item',()=>{
 const {world,riders}=pair('totem');Object.assign(riders[0],world.cargo);adventureAction(world,riders,1,'pickup',2);assert.equal(riders[0].adventure.points,0);Object.assign(riders[0],world.bank);assert(adventureAction(world,riders,1,'bank',4));assert.equal(riders[0].adventure.points,100);assert.equal(world.finished,false);Object.assign(riders[1],world.cargo);adventureAction(world,riders,2,'pickup',8);riders[1].hits++;stepAdventure(world,riders,[],.1,9);assert.equal(world.cargo.ownerId,null);world.elapsed=179.9;stepAdventure(world,riders,[],.2,180.1);assert.deepEqual(world.winners,[1]);
});

test('first totem delivery changes both objectives immediately, so banking cannot camp at one location',()=>{const world=createAdventure('totem','rift'),s=initAdventure(createRider('winner'),'totem');s.id=1;world.cargo.ownerId=1;world.cargo.pickReady=0;s.x=world.bank.x;s.z=world.bank.z;const old={cargo:{x:world.cargo.x,z:world.cargo.z},bank:{x:world.bank.x,z:world.bank.z}};assert(adventureAction(world,[s],1,'bank',2));assert.notDeepEqual({x:world.bank.x,z:world.bank.z},old.bank);assert.notDeepEqual({x:world.cargo.x,z:world.cargo.z},old.cargo);});
