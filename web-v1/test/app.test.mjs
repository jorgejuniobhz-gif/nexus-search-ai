import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { config, inside, safePath, searchQuery, normalizeResult } from '../core.mjs';
import { createApp, checkedFile } from '../server.mjs';
const salt='0'.repeat(32), password='synthetic-test-password', hash=salt+':'+scryptSync(password,salt,64).toString('hex');
const env={NEXUS_ADMIN_HASH:hash,NEXUS_ROOTS:JSON.stringify([{path:'C:\\ExampleData',unc:'\\\\example-server\\example-share'}])};
test('configuration fails closed for LAN, multiuser, arbitrary upstream and missing secrets',()=>{
 for(const change of [{NEXUS_HOST:'0.0.0.0'},{NEXUS_MODE:'ad'},{EVERYTHING_URL:'http://example.com/'},{EVERYTHING_URL:'http://127.0.0.1:8888/files'},{NEXUS_ADMIN_HASH:''},{NEXUS_ROOTS:'[]'}])assert.throws(()=>config({...env,...change}));
 assert.equal(config(env).downloads,false);
});
test('Windows containment rejects prefix siblings, traversal, ADS, device and malformed paths',()=>{
 assert(inside('C:\\ExampleData','c:\\exampledata\\a.txt'));
 assert(!inside('C:\\ExampleData','C:\\ExampleData-other\\a.txt'));
 assert(!inside('C:\\ExampleData','C:\\ExampleData\\..\\secret.txt'));
 for(const p of ['C:\\ExampleData\\a.txt:stream','C:\\ExampleData\\..\\a','C:\\ExampleData\\CON.txt','\\\\?\\C:\\ExampleData\\a','C:\\ExampleData\\a.','relative','C:/ExampleData/a'])assert(!safePath(p),p);
});
test('query pins upstream, limits pages, escapes user operators and restricts scope',()=>{
 const c=config(env),r=searchQuery(new URLSearchParams({q:'ext:pdf|*',type:'file',ext:'pdf;docx',offset:'25'}),c);
 assert.equal(r.url.origin,'http://127.0.0.1:8888');assert.equal(r.url.searchParams.get('json'),'1');assert.equal(r.url.searchParams.get('path'),'1');assert.equal(r.url.searchParams.get('count'),'25');
 const query=r.url.searchParams.get('search');assert(query.includes('file: ext:pdf;docx'));assert(query.includes('ext:pdf\\|\\*'));
 const scope=query.match(/^regex:"([^"]+)"/)[1];assert(new RegExp(scope,'i').test('C:\\ExampleData\\a.txt'));assert(!new RegExp(scope,'i').test('C:\\ExampleData-other\\a.txt'));
 for(const p of [{q:'" | file:'},{folder:'C:\\Secret'},{ext:'pdf | *'},{offset:'-1'},{count:'10000'}])assert.throws(()=>searchQuery(new URLSearchParams(p),c));
});
test('results are allowlisted and UNC mapping does not accept traversal',()=>{
 const c=config(env);assert.equal(normalizeResult({name:'a.pdf',path:'C:\\ExampleData',type:'file',size:'12'},c).unc,'\\\\example-server\\example-share\\a.pdf');
 for(const row of [{name:'a',path:'C:\\Secret',type:'file'},{name:'..\\secret',path:'C:\\ExampleData',type:'file'},{name:'a:stream',path:'C:\\ExampleData',type:'file'}])assert.equal(normalizeResult(row,c),null);
});
test('HTTP authentication, sessions, metadata authorization, errors and rechecked downloads',async t=>{
 let behavior='ok',calls=[],checks=0;
 const cfg={...config(env),port:31371,downloads:true};
 const app=createApp(cfg,{fetcher:async url=>{calls.push(url);if(behavior==='offline')throw Error();return new Response(JSON.stringify({totalResults:1,results:[{name:'sample.pdf',path:behavior==='outside'?'C:\\Secret':'C:\\ExampleData',type:'file',size:'12'}]}));},fileAccess:async()=>{checks++;if(behavior==='denied')throw Error();return {close:async()=>{}};}});
 await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(cfg.port,'127.0.0.1',resolve);});t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const origin=`http://127.0.0.1:${cfg.port}`;let cookie='';
 const req=(p,method='GET',payload,extra={})=>fetch(origin+p,{method,headers:{Origin:origin,Cookie:cookie,...extra},...(payload?{body:JSON.stringify(payload)}:{})});
 assert.equal((await req('/api/search')).status,401);assert.equal(calls.length,0);
 assert.equal((await req('/api/login','POST',{password:'bad'})).status,401);
 const login=await req('/api/login','POST',{password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
 assert.equal((await req('/api/search','GET',null,{'X-Forwarded-User':'admin'})).status,403);
 assert.equal((await req('/api/search','GET',null,{Origin:'http://evil.example'})).status,403);
 const response=await req('/api/search?q=sample');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();assert.equal(data.total,1);assert(data.items[0].id);
 assert.equal((await req('/api/access','POST',{id:'forged'})).status,403);
 assert.equal((await req('/api/access','POST',{id:data.items[0].id})).status,200);assert.equal(checks,1);
 behavior='denied';assert.equal((await req('/api/download?id='+data.items[0].id)).status,403);assert.equal(checks,2);
 behavior='outside';const outside=await req('/api/search');assert.equal(outside.status,502);assert(!(await outside.text()).includes('Secret'));
 behavior='offline';assert.equal((await req('/api/search')).status,502);
 assert.equal((await req('/api/logout','POST',{})).status,200);assert.equal((await req('/api/search')).status,401);
});
test('download streaming succeeds only from a server-held result and rechecks access',async t=>{
 const { Readable }=await import('node:stream');let checks=0;
 const cfg={...config(env),port:31372,downloads:true};
 const app=createApp(cfg,{fetcher:async()=>new Response(JSON.stringify({totalResults:1,results:[{name:'á.pdf',path:'C:\\ExampleData',type:'file'}]})),fileAccess:async()=>{checks++;return {close:async()=>{},createReadStream:()=>Readable.from(['synthetic bytes'])};}});
 await new Promise(r=>app.listen(cfg.port,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const origin=`http://127.0.0.1:${cfg.port}`;const login=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin},body:JSON.stringify({password})});const headers={Cookie:login.headers.get('set-cookie').split(';')[0]};
 const result=await(await fetch(origin+'/api/search',{headers})).json();const response=await fetch(origin+'/api/download?id='+result.items[0].id,{headers});assert.equal(await response.text(),'synthetic bytes');assert.equal(checks,1);assert.match(response.headers.get('content-disposition'),/%C3%A1/);
});
test('real Windows file access accepts a regular file, denies directories, missing files and junctions',{skip:process.platform!=='win32'},async()=>{
 const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os');
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'nexus-synthetic-'));
 const root=path.join(base,'approved'),outside=path.join(base,'outside'),link=path.join(root,'junction');
 await fs.mkdir(root);await fs.mkdir(outside);await fs.writeFile(path.join(root,'sample.txt'),'synthetic');await fs.writeFile(path.join(outside,'other.txt'),'synthetic');
 try{
  const handle=await checkedFile(path.join(root,'sample.txt'),[{path:root}]);assert.equal(await handle.readFile('utf8'),'synthetic');await handle.close();
  await assert.rejects(()=>checkedFile(root,[{path:root}]));await assert.rejects(()=>checkedFile(path.join(root,'missing.txt'),[{path:root}]));await assert.rejects(()=>checkedFile(path.join(outside,'other.txt'),[{path:root}]));
  await fs.symlink(outside,link,'junction');await assert.rejects(()=>checkedFile(path.join(link,'other.txt'),[{path:root}]));
 }finally{
  await fs.unlink(link).catch(()=>{});await fs.unlink(path.join(root,'sample.txt'));await fs.unlink(path.join(outside,'other.txt'));await fs.rmdir(root);await fs.rmdir(outside);await fs.rmdir(base);
 }
});
