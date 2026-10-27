import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fail, searchQuery, normalizeResult, inside } from './core.mjs';

const worker=fileURLToPath(new URL('../content-index/',import.meta.url));
export function contentRequest(params,scope){
 const query=searchQuery(params,scope);
 if(!query.q)fail(400,'Informe um termo para pesquisar no conteúdo.');
 return {roots:scope.roots.map(r=>r.path),q:query.q,folder:query.folder,view:query.view,
  type:params.get('type')||'all',ext:params.get('ext')||'',modifiedFrom:params.get('modifiedFrom')||'',
  modifiedTo:params.get('modifiedTo')||'',offset:query.offset,count:query.count};
}

export function runContentSearch(cfg,request){
 if(!cfg.content) return Promise.reject(Error('disabled'));
 return new Promise((resolve,reject)=>{
  const child=spawn(cfg.content.python,['-m','nexus_content','search','--db',cfg.content.db],{
   cwd:worker,windowsHide:true,shell:false,stdio:['pipe','pipe','ignore'],
   env:{...process.env,PYTHONUTF8:'1',PYTHONPATH:worker}});
  let bytes=0,settled=false;const chunks=[];
  const done=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill();reject(Error('content_unavailable'));}else resolve(value);};
  const timer=setTimeout(()=>done(true),8000);
  child.on('error',()=>done(true));child.stdin.on('error',()=>done(true));
  child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024)done(true);else chunks.push(chunk);});
  child.on('close',code=>{if(code!==0)return done(true);try{done(false,JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{done(true);}});
  child.stdin.end(JSON.stringify(request));
 });
}

export function contentResults(data,request,scope){
 const invalid=()=>fail(502,'Resposta inválida da pesquisa por conteúdo.');
 if(!data||!Array.isArray(data.items)||!Number.isSafeInteger(data.total)||data.total<0||
  data.items.length>request.count||data.offset!==request.offset||data.count!==request.count||
  data.items.length!==Math.min(request.count,Math.max(0,data.total-request.offset)))invalid();
 return data.items.map(row=>{
  if(typeof row.fullPath!=='string'||!Number.isSafeInteger(row.page)||row.page<1||
   typeof row.snippet!=='string'||row.snippet.length>2000)invalid();
  const item=normalizeResult({name:path.win32.basename(row.fullPath),path:path.win32.dirname(row.fullPath),type:'file'},scope);
  if(!item||(request.folder&&!inside(request.folder,item.fullPath)))invalid();
  return {...item,page:row.page,snippet:row.snippet};
 });
}
