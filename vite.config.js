import { defineConfig,loadEnv } from 'vite';
export default defineConfig(({command,mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_'),api=env.VITE_API_URL?new URL(env.VITE_API_URL):null;
 if(api&&(api.username||api.password||api.pathname!=='/'||api.search||api.hash||!['http:','https:'].includes(api.protocol)))throw new Error('VITE_API_URL must be a plain HTTP(S) origin');
 if(command==='build'&&api?.protocol==='http:')throw new Error('Public backend requires HTTPS');
 const connect=command==='serve'?"'self' blob: ws://127.0.0.1:5173 ws://localhost:5173":`'self' blob: ${api?`${api.origin} ${api.origin.replace(/^https:/,'wss:')}`:''}`;
 const policy=`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connect}; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'`;
 return {base:'./',plugins:[{name:'page-security',transformIndexHtml(html){return html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+policy+'"/>');}}],server:{port:5173,strictPort:true,proxy:{'/api':'http://127.0.0.1:8787','/ws':{target:'ws://127.0.0.1:8787',ws:true}}},build:{target:'es2022',chunkSizeWarningLimit:900,sourcemap:false}};
});
