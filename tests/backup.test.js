import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createStore} from '../server/store.js';
import {backupStore} from '../server/backup.js';

test('verified backup restores committed WAL accounts, session and best lap privately',async()=>{
 const root=mkdtempSync(join(tmpdir(),'moto-backup-')),store=createStore(join(root,'live.sqlite'));
 try{
  const account=await store.register('BackupRider','unique-game-password');store.record(account.user.id,'mt07',91.25);
  const path=await backupStore(store.db,join(root,'backups')),restored=new DatabaseSync(path,{readOnly:true});
  try{
   assert.equal(restored.prepare('SELECT nickname FROM users').get().nickname,'BackupRider');
   assert.equal(restored.prepare('SELECT MIN(seconds) best FROM laps').get().best,91.25);
   assert.equal(restored.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);
   assert.equal(statSync(path).mode&0o777,0o600);
   assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  }finally{restored.close();}
 }finally{store.close();rmSync(root,{recursive:true,force:true});}
});
