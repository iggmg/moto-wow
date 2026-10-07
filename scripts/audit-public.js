import { readdirSync,readFileSync,statSync } from 'node:fs';
import { resolve,relative } from 'node:path';
const root=resolve(process.argv[2]||'dist'),owner=(process.env.USER||'').toLowerCase(),failures=[];let files=0;
function visit(dir){for(const entry of readdirSync(dir)){const path=resolve(dir,entry),name=relative(root,path);if(statSync(path).isDirectory()){if(/(^|\/)(\.git|data|node_modules|test-results|playwright-report|artifacts)$/.test(name))failures.push(name+': private directory');else visit(path);continue;}files++;
 if(/(^|\/)(\.env(?!\.example)|.*\.(sqlite|sqlite-wal|sqlite-shm|map|log))$/i.test(name))failures.push(name+': private file');
 const bytes=readFileSync(path),text=bytes.toString('utf8'),lower=text.toLowerCase();
 if(/\/Users\/|\/home\/[^/\s]+\/|[A-Z]:\\Users\\/i.test(text))failures.push(name+': personal filesystem path');
 if(owner.length>5&&lower.includes(owner))failures.push(name+': owner identifier');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}/.test(text))failures.push(name+': credential');
}}
visit(root);if(failures.length){console.error(JSON.stringify({ok:false,files,failures},null,2));process.exitCode=1;}else console.log(JSON.stringify({ok:true,files,checks:['owner identifier','personal paths','private files','credential patterns']}));
