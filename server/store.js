import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync,chmodSync } from 'node:fs';
import { dirname } from 'node:path';
const scrypt=promisify(scryptCb);
const digest=token=>createHash('sha256').update(token).digest('hex');
export function createStore(path) {
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, nickname TEXT NOT NULL COLLATE NOCASE UNIQUE, password TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS laps (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), bike TEXT NOT NULL, seconds REAL NOT NULL CHECK(seconds > 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS lap_user_bike ON laps(user_id,bike,seconds);`);
  const publicUser=u=>({id:u.id,nickname:u.nickname});
  function issueSession(user){db.prepare('DELETE FROM sessions WHERE user_id=? AND token NOT IN (SELECT token FROM sessions WHERE user_id=? ORDER BY expires DESC LIMIT 4)').run(user.id,user.id);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+7*86400000);return {user:publicUser(user),token};}
  return {
    db,
    async register(nickname,password) {
      if(typeof nickname!=='string'||!/^[\p{L}\p{N}_-]{3,20}$/u.test(nickname))throw new Error('Ник: 3–20 букв, цифр, _ или -.');
      if(typeof password!=='string'||password.length<10||password.length>128)throw new Error('Пароль: 10–128 символов.');
      const salt=randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
      let id;try{id=db.prepare('INSERT INTO users(nickname,password) VALUES(?,?)').run(nickname,`${salt}:${hash}`).lastInsertRowid;}catch(e){if(e.code?.startsWith('ERR_SQLITE'))throw new Error('Этот ник уже занят.');throw e;}
      return issueSession({id:Number(id),nickname});
    },
    async login(nickname,password) {
      if(typeof nickname!=='string'||typeof password!=='string'||nickname.length>20||password.length>128)throw new Error('Неверный ник или пароль.');
      const u=db.prepare('SELECT * FROM users WHERE nickname=?').get(nickname),parts=(u?.password||'00000000000000000000000000000000:'+ '00'.repeat(64)).split(':');
      const attempt=await scrypt(password,parts[0],64);
      if(!timingSafeEqual(attempt,Buffer.from(parts[1],'hex'))||!u)throw new Error('Неверный ник или пароль.');
      return issueSession(u);
    },
    session(token) {if(typeof token!=='string'||token.length!==64)return null;const u=db.prepare('SELECT u.id,u.nickname FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now());return u?publicUser(u):null;},
    logout(token){if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));},
    record(userId,bike,seconds){db.prepare('INSERT INTO laps(user_id,bike,seconds) VALUES(?,?,?)').run(userId,bike,seconds);},
    leaderboard(bike){return db.prepare(`SELECT u.nickname,l.bike,MIN(l.seconds) seconds,COUNT(*) laps FROM laps l JOIN users u ON u.id=l.user_id ${bike?'WHERE l.bike=?':''} GROUP BY l.user_id,l.bike ORDER BY seconds ASC LIMIT 50`).all(...(bike?[bike]:[]));},
    stats(userId){return db.prepare('SELECT bike,MIN(seconds) best,COUNT(*) laps FROM laps WHERE user_id=? GROUP BY bike').all(userId);},
    cleanup(){db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());},
    close(){db.close();}
  };
}
