import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { scryptSync } from 'node:crypto';
import { Readable } from 'node:stream';
import { UserStore, accountRoots } from '../users.mjs';
import { config, passwordOK } from '../core.mjs';
import { createApp } from '../server.mjs';
const salt='2'.repeat(32),password='synthetic-admin-password',hash=salt+':'+scryptSync(password,salt,64).toString('hex');
const env={NEXUS_ADMIN_HASH:hash,NEXUS_ROOTS:JSON.stringify([{path:'C:\\ExampleData',unc:'\\\\example-server\\example-share'}])};
const makeUser=(username,p,downloads=true)=>({username,name:'Synthetic '+username,password:'synthetic-user-password',active:true,downloads,paths:p});
test('accounts LAN mode requires HTTPS and trusted configured origin',()=>{
 assert.throws(()=>config({...env,NEXUS_MODE:'accounts',NEXUS_HOST:'0.0.0.0'}));
 assert.throws(()=>config({...env,NEXUS_MODE:'accounts',NEXUS_HOST:'0.0.0.0',NEXUS_TLS_CERT:'fixture',NEXUS_TLS_KEY:'fixture',NEXUS_PUBLIC_ORIGIN:'http://example.invalid'}));
 const cfg=config({...env,NEXUS_MODE:'accounts',NEXUS_HOST:'0.0.0.0',NEXUS_TLS_CERT:'fixture',NEXUS_TLS_KEY:'fixture',NEXUS_PUBLIC_ORIGIN:'https://example.invalid:3443',NEXUS_PORT:'3443'});
 assert.equal(cfg.publicOrigin,'https://example.invalid:3443');assert.equal(cfg.host,'0.0.0.0');assert.equal(cfg.upstream.origin,'http://127.0.0.1:8888');
});
test('user store persists salted hashes, prevents invalid grants and handles concurrent edits',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os');const base=await fs.mkdtemp(path.join(process.cwd(),'.nexus-test-accounts-')),file=path.join(base,'users.json'),cfg=config(env);
 try{
  const store=await UserStore.open(file);const first=await store.save(makeUser('alice',['C:\\ExampleData\\Alpha']),cfg);
  assert(!JSON.stringify(first).includes('hash'));assert(!JSON.stringify(first).includes('password'));
  const raw=await fs.readFile(file,'utf8');assert(!raw.includes('synthetic-user-password'));assert(passwordOK('synthetic-user-password',store.get(first.id).hash));
  const restored=await UserStore.open(file);assert.equal(restored.get(first.id).username,'alice');
  await assert.rejects(()=>store.save(makeUser('alice',[]),cfg),e=>e.status===409);
  await assert.rejects(()=>store.save(makeUser('admin',[]),cfg),e=>e.status===400);
  await assert.rejects(()=>store.save(makeUser('outside',['C:\\Other']),cfg),e=>e.status===400);
  await assert.rejects(()=>store.save({...makeUser('short',[]),password:'short'},cfg),e=>e.status===400);
  const change={...first,password:'',name:'Changed'};
  const result=await Promise.allSettled([store.save(change,cfg,first.id),store.save(change,cfg,first.id)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(accountRoots(store.get(first.id),cfg)[0].unc,'\\\\example-server\\example-share\\Alpha');
  const narrowed={...cfg,roots:[{path:'C:\\ExampleData\\Beta'}]};assert.deepEqual(accountRoots(store.get(first.id),narrowed),[]);
  await fs.writeFile(file,'corrupted');await assert.rejects(()=>UserStore.open(file));
  const blocking=path.join(base,'blocked');await fs.writeFile(blocking,'fixture');const unwritable=new UserStore(path.join(blocking,'users.json'));await assert.rejects(()=>unwritable.save(makeUser('safe',[]),cfg));assert.equal(unwritable.list().length,0);await fs.unlink(blocking);
 }finally{await fs.unlink(file).catch(()=>{});await fs.rmdir(base);}
});
test('accounts isolate metadata, tree, totals and downloads; changes revoke sessions and in-flight searches',async t=>{
 const cfg={...config(env),port:31374,downloads:true},users=new UserStore();let calls=0,lastQuery,openRoots,gate=null,announce,badPage=false;
 const rows=[{name:'alpha.txt',path:'C:\\ExampleData\\Alpha',type:'file',size:'5'},{name:'SubA',path:'C:\\ExampleData\\Alpha',type:'folder'},{name:'nested.txt',path:'C:\\ExampleData\\Alpha\\SubA',type:'file',size:'6'},{name:'beta.txt',path:'C:\\ExampleData\\Beta',type:'file',size:'4'}];
 const app=createApp(cfg,{users,fetcher:async url=>{calls++;lastQuery=url.searchParams.get('search');const regexes=[...lastQuery.matchAll(/regex:"([^"]+)"/g)].map(m=>new RegExp(m[1],'i'));const items=rows.filter(r=>regexes.every(re=>re.test(path.win32.join(r.path,r.name)))&&(!lastQuery.includes('folder:')||r.type==='folder'));if(gate){announce();await gate;}return new Response(JSON.stringify(badPage?{totalResults:999999,results:[rows[3]]}:{totalResults:items.length,results:items}));},fileAccess:async(full,roots)=>{openRoots=roots;return {close:async()=>{},createReadStream:()=>Readable.from(['synthetic'])};}});
 await new Promise((r,j)=>{app.once('error',j);app.listen(cfg.port,'127.0.0.1',r);});t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const origin=`http://127.0.0.1:${cfg.port}`;
 const req=(route,cookie='',method='GET',payload)=>fetch(origin+route,{method,headers:{Origin:origin,Cookie:cookie},...(payload?{body:JSON.stringify(payload)}:{})});
 const login=async(username,pass=password)=>{const response=await req('/api/login','','POST',{username,password:pass});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
 const admin=await login('admin');
 const aResponse=await req('/api/admin/users',admin,'POST',makeUser('alice',['C:\\ExampleData\\Alpha']));assert.equal(aResponse.status,201);let a=(await aResponse.json()).user;
 const b=(await(await req('/api/admin/users',admin,'POST',makeUser('bob',['C:\\ExampleData\\Beta']))).json()).user;
 let alice=await login('alice','synthetic-user-password'),bob=await login('bob','synthetic-user-password');
 assert.equal((await req('/data/users.json',alice)).status,404);assert.equal((await req('/.env',alice)).status,404);
 assert.equal((await req('/api/admin/users',alice)).status,403);assert.equal((await req('/api/admin/users',alice,'POST',makeUser('mallory',[]))).status,403);
 const listed=await(await req('/api/admin/users',admin)).text();assert(!listed.includes('hash'));assert(!listed.includes('synthetic-user-password'));
 const roots=await(await req('/api/roots',alice)).json();assert.deepEqual(roots.roots,[{path:'C:\\ExampleData\\Alpha',name:'Alpha'}]);
 const aSearch=await req('/api/search',alice);const aText=await aSearch.text();assert(!aText.includes('Beta'));const aData=JSON.parse(aText);assert.equal(aData.total,3);assert(!lastQuery.includes('Beta'));
 badPage=true;const leak=await req('/api/search',alice);assert.equal(leak.status,502);const leakText=await leak.text();assert(!leakText.includes('999999'));assert(!leakText.includes('beta.txt'));badPage=false;
 const bData=await(await req('/api/search',bob)).json();assert.equal(bData.total,1);assert(!JSON.stringify(bData).includes('Alpha'));
 const aFile=aData.items.find(i=>i.type==='file');assert.equal((await req('/api/access',bob,'POST',{id:aFile.id})).status,403);assert.equal((await req('/api/download?id='+aFile.id,bob)).status,403);
 cfg.downloads=false;assert.equal((await req('/api/access',alice,'POST',{id:aFile.id})).status,403);cfg.downloads=true;
 const download=await req('/api/download?id='+aFile.id,alice);assert.equal(await download.text(),'synthetic');assert.deepEqual(openRoots.map(r=>r.path),['C:\\ExampleData\\Alpha']);
 const denied=await req('/api/folders?'+new URLSearchParams({folder:'C:\\ExampleData\\Beta'}),alice);assert.equal(denied.status,403);
 const aTree=await(await req('/api/folders?'+new URLSearchParams({folder:'C:\\ExampleData\\Alpha'}),alice)).json();assert.equal(aTree.total,1);assert.equal(aTree.items[0].name,'SubA');
 // Permissions are changed by the admin; previous cookies and IDs stop working.
 a=(await(await req('/api/admin/users/'+a.id,admin,'POST',{...a,downloads:false})).json()).user;assert.equal((await req('/api/search',alice)).status,401);
 alice=await login('alice','synthetic-user-password');const noDownload=await(await req('/api/search',alice)).json();assert.equal((await req('/api/access',alice,'POST',{id:noDownload.items[0].id})).status,403);
 const disabled=(await(await req('/api/admin/users/'+b.id,admin,'POST',{...b,active:false})).json()).user;assert.equal(disabled.active,false);assert.equal((await req('/api/roots',bob)).status,401);assert.equal((await req('/api/login','','POST',{username:'bob',password:'synthetic-user-password'})).status,401);
 a=(await(await req('/api/admin/users/'+a.id,admin,'POST',{...a,password:'synthetic-new-password'})).json()).user;assert.equal((await req('/api/search',alice)).status,401);assert.equal((await req('/api/login','','POST',{username:'alice',password:'synthetic-user-password'})).status,401);alice=await login('alice','synthetic-new-password');
 let release;gate=new Promise(r=>release=r);const started=new Promise(r=>announce=r);const pending=req('/api/search',alice);await started;
 a=(await(await req('/api/admin/users/'+a.id,admin,'POST',{...a,paths:['C:\\ExampleData\\Beta']})).json()).user;release();gate=null;const stale=await pending;assert.equal(stale.status,401);assert(!(await stale.text()).includes('alpha.txt'));
 // No grants means no query and no metadata, including global counts.
 const empty=await users.save(makeUser('empty',[]),cfg);const emptyCookie=await login(empty.username,'synthetic-user-password');const before=calls;const emptyResult=await(await req('/api/search',emptyCookie)).json();assert.equal(emptyResult.total,0);assert.equal(calls,before);assert.deepEqual((await(await req('/api/roots',emptyCookie)).json()).roots,[]);
});

test('deactivation aborts an already-open download',async t=>{
 const {PassThrough}=await import('node:stream');const cfg={...config(env),port:31375,downloads:true},users=new UserStore();const user=await users.save(makeUser('streamer',['C:\\ExampleData\\Alpha']),cfg);const stream=new PassThrough();let opened;
 const opening=new Promise(r=>opened=r);
 const app=createApp(cfg,{users,fetcher:async()=>new Response(JSON.stringify({totalResults:1,results:[{name:'sample.txt',path:'C:\\ExampleData\\Alpha',type:'file'}]})),fileAccess:async()=>{opened();return {close:async()=>{},createReadStream:()=>stream};}});
 await new Promise(r=>app.listen(cfg.port,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const origin=`http://127.0.0.1:${cfg.port}`;const login=async(username,pass)=>{const r=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin},body:JSON.stringify({username,password:pass})});return r.headers.get('set-cookie').split(';')[0];};const cookie=await login('streamer','synthetic-user-password'),admin=await login('admin',password);
 const result=await(await fetch(origin+'/api/search',{headers:{Cookie:cookie}})).json();const pending=fetch(origin+'/api/download?id='+result.items[0].id,{headers:{Cookie:cookie}});await opening;stream.write('first');const response=await pending;const reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'first');
 const changed=await fetch(origin+'/api/admin/users/'+user.id,{method:'POST',headers:{Origin:origin,Cookie:admin},body:JSON.stringify({...user,active:false})});assert.equal(changed.status,200);
 let ended=false;try{ended=(await reader.read()).done;}catch{ended=true;}assert(ended);assert.equal((await fetch(origin+'/api/session',{headers:{Cookie:cookie}})).status,401);
});

test('self-service password change verifies current secret, revokes all sessions and persists admin override',async t=>{
 const fs=await import('node:fs/promises');const base=await fs.mkdtemp(path.join(process.cwd(),'.nexus-test-password-')),file=path.join(base,'users.json');let users=await UserStore.open(file);const cfg={...config(env),port:31376};const user=await users.save(makeUser('changer',[]),cfg);
 const app=createApp(cfg,{users});await new Promise(r=>app.listen(cfg.port,'127.0.0.1',r));t.after(async()=>{app.closeAllConnections();await new Promise(r=>app.close(r));await fs.unlink(file);await fs.rmdir(base);});
 const origin=`http://127.0.0.1:${cfg.port}`;const req=(route,cookie='',method='GET',payload)=>fetch(origin+route,{method,headers:{Origin:origin,Cookie:cookie},...(payload?{body:JSON.stringify(payload)}:{})});
 const login=async(username,pass)=>{const r=await req('/api/login','','POST',{username,password:pass});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 const change=(cookie,old,next,confirmation=next)=>req('/api/password',cookie,'POST',{currentPassword:old,newPassword:next,confirmPassword:confirmation,userId:'bootstrap-admin'});
 assert.equal((await change('',password,'synthetic-new-secret')).status,401);
 const first=await login('changer','synthetic-user-password'),second=await login('changer','synthetic-user-password');
 assert.equal((await change(first,'wrong','synthetic-new-secret')).status,403);
 assert.equal((await change(first,'synthetic-user-password','synthetic-new-secret','mismatch')).status,400);
 assert.equal((await change(first,'synthetic-user-password','short')).status,400);
 assert.equal((await change(first,'synthetic-user-password','synthetic-new-secret')).status,200);
 assert.equal((await req('/api/session',first)).status,401);assert.equal((await req('/api/session',second)).status,401);assert.equal(users.admin,null);assert(passwordOK('synthetic-new-secret',users.get(user.id).hash));
 const admin=await login('admin',password);assert.equal((await change(admin,password,'synthetic-new-admin')).status,200);assert.equal((await req('/api/session',admin)).status,401);
 assert.equal((await req('/api/login','','POST',{username:'admin',password})).status,401);await login('admin','synthetic-new-admin');
 const restored=await UserStore.open(file);assert(passwordOK('synthetic-new-admin',restored.admin.hash));assert(!passwordOK(password,restored.admin.hash));assert(passwordOK('synthetic-new-secret',restored.get(user.id).hash));
 // An unrelated account update must not erase the administrator's new credential.
 await restored.save({...restored.list()[0],name:'Updated name'},cfg,user.id);const reopened=await UserStore.open(file);assert(passwordOK('synthetic-new-admin',reopened.admin.hash));assert(!(await fs.readFile(file,'utf8')).includes('synthetic-new-admin'));
});
