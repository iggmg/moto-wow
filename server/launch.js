import { mkdirSync,chownSync,chmodSync } from 'node:fs';

process.umask(0o077);
// Railway mounts new volumes as root. Initialize only /data, then drop root
// before importing the application or accepting any network traffic.
if(process.getuid?.()===0){
  mkdirSync('/data',{recursive:true});chownSync('/data',1000,1000);chmodSync('/data',0o700);
  process.setgroups([]);process.setgid(1000);process.setuid(1000);
}
const {startGameServer}=await import('./index.js');
await startGameServer();
