import { backup,DatabaseSync } from 'node:sqlite';
import { mkdir,chmod,rename,readdir,unlink } from 'node:fs/promises';
import { join } from 'node:path';

// A complete SQLite backup includes committed WAL data; files never enter dist.
export async function backupStore(db,directory){
  await mkdir(directory,{recursive:true,mode:0o700});
  const name=`moto-wow-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`,path=join(directory,name),temporary=path+'.tmp';
  await backup(db,temporary);await chmod(temporary,0o600);
  const restored=new DatabaseSync(temporary,{readOnly:true});
  try{if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Invalid database backup');}finally{restored.close();for(const suffix of ['-shm','-wal'])await unlink(temporary+suffix).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  await rename(temporary,path);
  const files=(await readdir(directory)).filter(f=>/^moto-wow-\d{4}-\d{2}-\d{2}T[\d-]+Z\.sqlite$/.test(f)).sort().reverse();
  for(const old of files.slice(7))await unlink(join(directory,old));
  console.log('Database backup verified');return path;
}
