import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GamepadInput} from '../src/gamepad-input.js';
const pad=()=>({connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
test('standard pad provides analogue pedals, correct steering and edge-triggered camera action',()=>{
 const input=new GamepadInput(),p=pad();input.sample([p]);p.buttons[7]={pressed:true,value:.6};p.axes[0]=-.6;p.buttons[3]={pressed:true,value:1};const first=input.sample([p]);assert.equal(first.throttle,.6);assert(first.steer<0);assert.deepEqual(first.actions,['camera']);assert.deepEqual(input.sample([p]).actions,[]);
});
test('focus loss and a missing release require neutral pedals before driving can resume',()=>{
 const input=new GamepadInput(),p=pad();input.sample([p]);p.buttons[7]={pressed:true,value:1};assert.equal(input.sample([p]).throttle,1);input.sample([p],false);assert.equal(input.sample([p]).throttle,0);p.buttons[7]={pressed:false,value:0};input.sample([p]);p.buttons[7]={pressed:true,value:1};assert.equal(input.sample([p]).throttle,1);
});
