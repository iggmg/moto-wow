import {cpSync,mkdirSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
const dest=resolve('artifacts/public-source');
// Explicit allowlist: local logs, profiles, databases and Git metadata never enter the export.
const allowed=['src','shared','server','public','assets','docs','tests','scripts','.github','AGENTS.md','.gitignore','.dockerignore','.env.example','Dockerfile','compose.yaml','index.html','package.json','package-lock.json','playwright.config.js','vite.config.js','README.md'];
const stage=mkdtempSync(resolve(tmpdir(),'moto-public-'));
for(const name of allowed)if(existsSync(name))cpSync(name,resolve(stage,name),{recursive:true});
const result=spawnSync(process.execPath,['scripts/audit-public.js',stage],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
mkdirSync(dest,{recursive:true});
for(const name of allowed)if(existsSync(resolve(stage,name)))cpSync(resolve(stage,name),resolve(dest,name),{recursive:true});
rmSync(stage,{recursive:true});
console.log('Public source export ready: artifacts/public-source (no local Git history).');
