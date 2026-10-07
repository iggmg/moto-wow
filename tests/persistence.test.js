import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.js';
test('account, session and best lap survive database restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'moto-persistence-')),path=join(dir,'test.sqlite');let store=createStore(path);
  try{const r=await store.register('PersistentRider','test-password-strong');store.record(r.user.id,'himalayan',55.12);store.close();store=createStore(path);assert.equal(store.session(r.token).nickname,'PersistentRider');assert.equal(store.leaderboard('himalayan')[0].seconds,55.12);assert.equal((await store.login('PersistentRider','test-password-strong')).user.id,r.user.id);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
