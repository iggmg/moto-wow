import {cpSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const dest=resolve('artifacts/public-source');
// Explicit allowlist: local logs, profiles, databases and Git metadata never enter the export.
const allowed=['src','shared','server','public','assets','docs','tests','scripts','.github','AGENTS.md','.gitignore','.dockerignore','.env.example','Dockerfile','compose.yaml','index.html','package.json','package-lock.json','playwright.config.js','vite.config.js','README.md'];
mkdirSync(dest,{recursive:true});
for(const name of allowed)if(existsSync(name))cpSync(name,resolve(dest,name),{recursive:true});
const result=spawnSync(process.execPath,['scripts/audit-public.js',dest],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
console.log('Public source export ready: artifacts/public-source (no local Git history).');
