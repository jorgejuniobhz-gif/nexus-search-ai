import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, rename, symlink, rmdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../core.mjs';
import { createApp } from '../server.mjs';
import { UserStore } from '../users.mjs';
import { contentRequest, contentResults, runContentSearch } from '../content.mjs';
const salt='5'.repeat(32),password='synthetic-test-password',hash=salt+':'+scryptSync(password,salt,64).toString('hex');
const base=config({NEXUS_ADMIN_HASH:hash,NEXUS_ROOTS:JSON.stringify([{path:'C:\\ExampleData'}])});
const grant=(username,paths)=>({username,name:username,password,paths,active:true,downloads:true});

test('content disabled by default; validation and malformed/out-of-scope worker responses fail closed',()=>{
 assert.equal(base.content,null);
 assert.throws(()=>contentRequest(new URLSearchParams(),base),e=>e.status===400);
 assert.throws(()=>contentRequest(new URLSearchParams({q:'vistoria',folder:'C:\\Private'}),base),e=>e.status===403);
 const request=contentRequest(new URLSearchParams({q:'vistoria'}),base);
 for(const row of [{fullPath:'C:\\Private\\secret.pdf',page:1,snippet:'private'},
  {fullPath:'C:\\ExampleData-other\\secret.pdf',page:1,snippet:'private'},
  {fullPath:'C:\\ExampleData\\ok.pdf',page:0,snippet:'private'}]){
  assert.throws(()=>contentResults({items:[row],total:1,count:25,offset:0},request,base),e=>e.status===502);
 }
});

test('content API isolates accounts, hides errors/totals, rechecks revocations and preserves Everything',async t=>{
 const cfg={...base,port:31379,content:{python:'fixture',db:'fixture'},downloads:true},users=new UserStore();
 let calls=0,bad=false,offline=false,announce,gate=null;
 let alice=await users.save(grant('alice',['C:\\ExampleData\\Alpha']),cfg);
 await users.save(grant('bob',['C:\\ExampleData\\Beta']),cfg);await users.save(grant('empty',[]),cfg);
 const app=createApp(cfg,{users,fetcher:async()=>new Response(JSON.stringify({results:[],totalResults:0})),contentSearcher:async(_cfg,request)=>{
  calls++;assert.equal(request.roots.length,1);
  if(gate){announce();await gate;}
  if(offline)throw Error('PRIVATE document and path');
  return {total:bad?999999:1,count:request.count,offset:request.offset,items:[{fullPath:bad?'C:\\ExampleData\\Beta\\private.pdf':request.roots[0]+'\\teste_nexus.pdf',page:2,snippet:'vistoria ficticia'}]};
 }});
 await new Promise(r=>app.listen(cfg.port,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const origin=`http://127.0.0.1:${cfg.port}`;
 const req=(route,cookie='',method='GET',payload)=>fetch(origin+route,{method,headers:{Origin:origin,Cookie:cookie},...(payload?{body:JSON.stringify(payload)}:{})});
 const login=async username=>{const r=await req('/api/login','','POST',{username,password});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 const a=await login('alice'),b=await login('bob'),empty=await login('empty');
 assert.equal((await req('/api/content-search?q=vistoria')).status,401);
 const data=await(await req('/api/content-search?q=vistoria',a)).json();assert.equal(data.total,1);assert.equal(data.items[0].page,2);assert(!JSON.stringify(data).includes('Beta'));
 assert.equal((await req('/api/download?id='+data.items[0].id,b)).status,403);
 const bdata=await(await req('/api/content-search?q=vistoria',b)).json();assert(!JSON.stringify(bdata).includes('Alpha'));
 const before=calls;assert.equal((await(await req('/api/content-search?q=vistoria',empty)).json()).total,0);assert.equal(calls,before);
 assert.equal((await req('/api/content-search?q=vistoria&folder=C%3A%5CExampleData%5CBeta',a)).status,403);
 bad=true;const leak=await req('/api/content-search?q=vistoria',a);assert.equal(leak.status,502);const text=await leak.text();assert(!text.includes('999999'));assert(!text.includes('private.pdf'));bad=false;
 offline=true;const error=await req('/api/content-search?q=vistoria',a);assert.equal(error.status,503);assert(!(await error.text()).includes('PRIVATE'));offline=false;
 assert.equal((await req('/api/search?q=vistoria',a)).status,200);
 let release;gate=new Promise(r=>release=r);const started=new Promise(r=>announce=r);const pending=req('/api/content-search?q=vistoria',a);await started;
 alice=await users.save({...alice,paths:['C:\\ExampleData\\Beta'],password:''},cfg,alice.id);release();gate=null;
 const revoked=await pending;assert.equal(revoked.status,401);assert(!(await revoked.text()).includes('vistoria ficticia'));
});

test('real Python SQLite worker scopes matching pages and totals before pagination', {skip:!process.env.NEXUS_TEST_PYTHON||process.platform!=='win32'},async()=>{
 const root=await mkdtemp(path.join(process.cwd(),'.nexus-test-content-'));
 const cwd=fileURLToPath(new URL('../../content-index/',import.meta.url));
 try{
  await promisify(execFile)(process.env.NEXUS_TEST_PYTHON,['tests/seed.py',root],{cwd,env:{...process.env,PYTHONPATH:cwd},windowsHide:true});
  const cfg={...base,roots:[{path:path.join(root,'Alpha')}],content:{python:process.env.NEXUS_TEST_PYTHON,db:path.join(root,'content.sqlite')}};
  const request=contentRequest(new URLSearchParams({q:'vistoria'}),cfg);
  const data=await runContentSearch(cfg,request);const items=contentResults(data,request,cfg);
  assert.equal(data.total,1);assert.equal(items[0].name,'teste_nexus.pdf');assert.equal(items[0].page,1);
  assert(!JSON.stringify(data).includes('Beta'));assert(!JSON.stringify(data).includes('Alpha-other'));
  // Replace an indexed directory with a junction to the same file (same mtime/size).
  // Query must still hide its text before any reindex, not follow the junction.
  const moved=path.join(root,'Moved');await rename(path.join(root,'Alpha'),moved);
  await symlink(moved,path.join(root,'Alpha'),'junction');
  const linked=await runContentSearch(cfg,request);assert.equal(linked.total,0);
  await rmdir(path.join(root,'Alpha'));await rename(moved,path.join(root,'Alpha'));
  const none=await runContentSearch(cfg,{...request,roots:[]});assert.equal(none.total,0);
  await assert.rejects(()=>runContentSearch({...cfg,content:{...cfg.content,db:path.join(root,'missing.sqlite')}},request));
 }finally{await rm(root,{recursive:true,force:true});}
});
