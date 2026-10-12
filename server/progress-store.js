import {gzipSync,gunzipSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import {BADGES,RESULT_MODES,earnedBadges} from '../shared/progression.js';
import {validateReplay} from '../shared/replay.js';
import {trackById,PHYSICS_VERSION} from '../shared/tracks.js';
const fields=['mode','bike','trackId','trackRevision','physicsVersion','weather','setup','variant','fieldSize','challengeId','level','seconds','laps','hits','points','style','passes','rescues','fuelGiven','won','status'];
function summaryOf(r){const out=Object.fromEntries(fields.map(k=>[k,r[k]??(k==='setup'?'stock':k==='variant'?'standard':k==='fieldSize'?1:['challengeId','level'].includes(k)?'':0)]));if(!RESULT_MODES.includes(out.mode)||!Number.isFinite(out.seconds)||out.seconds<=0||out.seconds>86400||!Number.isFinite(out.points)||out.points<0||out.points>1000000)throw new Error('Invalid authoritative result');return out;}
export function installProgressStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS results(id TEXT PRIMARY KEY,match_id TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES users(id),mode TEXT NOT NULL,track TEXT NOT NULL,revision INTEGER NOT NULL,physics INTEGER NOT NULL,weather TEXT NOT NULL,challenge TEXT NOT NULL DEFAULT '',seconds REAL NOT NULL,points INTEGER NOT NULL,won INTEGER NOT NULL,summary TEXT NOT NULL,replay TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(match_id,user_id));
 CREATE INDEX IF NOT EXISTS result_context ON results(mode,track,revision,physics,weather,challenge,seconds);
 CREATE TABLE IF NOT EXISTS badges(user_id INTEGER NOT NULL REFERENCES users(id),badge TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,badge));
 CREATE TABLE IF NOT EXISTS cosmetics(user_id INTEGER PRIMARY KEY REFERENCES users(id),badge TEXT NOT NULL DEFAULT '');`);
 const profile=userId=>({badges:db.prepare('SELECT badge,created_at FROM badges WHERE user_id=?').all(userId),cosmetic:db.prepare('SELECT badge FROM cosmetics WHERE user_id=?').get(userId)?.badge||'',results:db.prepare('SELECT id,summary,created_at FROM results WHERE user_id=? ORDER BY rowid DESC LIMIT 30').all(userId).map(r=>({id:r.id,...JSON.parse(r.summary),date:r.created_at}))});
 return {
  profile,
  setCosmetic(userId,badge){if(badge!==''&&(!BADGES.some(b=>b.id===badge)||!db.prepare('SELECT 1 FROM badges WHERE user_id=? AND badge=?').get(userId,badge)))throw new Error('Этот знак ещё не получен.');db.prepare('INSERT INTO cosmetics VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET badge=excluded.badge').run(userId,badge);return profile(userId);},
  saveResult(matchId,userId,result,replay=null){
   const old=db.prepare('SELECT id FROM results WHERE match_id=? AND user_id=?').get(matchId,userId);if(old)return old.id;
   const r=summaryOf(result),id=randomUUID();let recording=null;try{if(replay){const bytes=gzipSync(JSON.stringify(validateReplay(replay))),used=db.prepare('SELECT COALESCE(SUM(LENGTH(replay)),0) n FROM results WHERE replay IS NOT NULL').get().n;if(used+bytes.length<=20*1024*1024)recording=bytes;}}catch{/* A result remains valid even when an overlong recording was not retained. */}
   db.exec('BEGIN');try{db.prepare('INSERT INTO results(id,match_id,user_id,mode,track,revision,physics,weather,challenge,seconds,points,won,summary,replay) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,matchId,userId,r.mode,r.trackId,r.trackRevision,r.physicsVersion,r.weather,r.challengeId,r.seconds,r.points,r.won?1:0,JSON.stringify(r),recording);for(const badge of earnedBadges(r))db.prepare('INSERT OR IGNORE INTO badges(user_id,badge) VALUES(?,?)').run(userId,badge);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return id;
  },
  result(id){const r=db.prepare('SELECT r.id,r.summary,r.replay,r.created_at,u.nickname FROM results r JOIN users u ON u.id=r.user_id WHERE r.id=?').get(id);return r?{id:r.id,nickname:r.nickname,...JSON.parse(r.summary),replay:r.replay?JSON.parse(typeof r.replay==='string'?r.replay:gunzipSync(r.replay).toString('utf8')):null,date:r.created_at}:null;},
  modeRanking(mode,trackId,weather,challenge='',fieldSize=1){
   const track=trackById(trackId),pointMode=['arcade','courier','totem'].includes(mode),rows=db.prepare(`SELECT r.id,u.nickname,r.summary FROM results r JOIN users u ON u.id=r.user_id WHERE r.mode=? AND r.track=? AND r.revision=? AND r.physics=? AND r.weather=? AND r.challenge=? AND COALESCE(json_extract(r.summary,'$.variant'),'standard')='standard' ${['courier','elimination','totem','race'].includes(mode)?"AND COALESCE(json_extract(r.summary,'$.fieldSize'),1)=?":''} ORDER BY ${pointMode?'r.points DESC,r.seconds ASC':'r.won DESC,r.seconds ASC'} LIMIT 300`).all(mode,track.id,track.revision,PHYSICS_VERSION,weather,challenge,...(['courier','elimination','totem','race'].includes(mode)?[fieldSize]:[])),seen=new Set();return rows.filter(r=>{const key=r.nickname.toLowerCase()+':'+JSON.parse(r.summary).bike;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,50).map(r=>({id:r.id,nickname:r.nickname,...JSON.parse(r.summary)}));
  }
 };
}
