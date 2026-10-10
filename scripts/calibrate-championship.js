import {driveHandlingLap} from '../tests/helpers/handling-pilot.js';
import {writeFileSync} from 'node:fs';
import {BIKES,TRACKS,VERSION} from '../shared/game.js';
const thresholds={};
for(const track of TRACKS){thresholds[track.id]={};for(const bike of BIKES){const {state:s,widest}=driveHandlingLap(bike,track,track.weather);if(!s.completed||widest>track.width/2)throw new Error('Calibration did not finish inside the road');thresholds[track.id][bike.id]={gold:Math.ceil(s.last*1.12+4),silver:Math.ceil(s.last*1.35+10),bronze:Math.ceil(s.last*1.65+20),reference:Number(s.last.toFixed(2))};}}
writeFileSync('shared/championship-times.json',JSON.stringify({physicsVersion:VERSION,calibration:'Useful-pace steering pilot (target >=4 m/s), ordinary controls and inside the road; isolated from enemy damage. Gold = ceil(reference × 1.12 + 4), silver × 1.35 + 10, bronze × 1.65 + 20.',thresholds},null,2)+'\n');
