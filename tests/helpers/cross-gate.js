import {trackData,trackHeading,groundHeight} from '../../shared/game.js';
// Fixtures place a bike just before a gate; normal forward motion must cross it.
export function approachGate(s,index){const g=trackData(s.trackId).GATES[index%16],yaw=trackHeading(g.t,s.trackId),x=g.x-Math.sin(yaw)*.04,z=g.z-Math.cos(yaw)*.04;Object.assign(s,{x,z,y:groundHeight(x,z,s.trackId),yaw,travelYaw:yaw,speed:6,steer:0,airborne:false,lastRamp:null,contactVX:0,contactVZ:0});}
