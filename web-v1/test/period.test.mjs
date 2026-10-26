import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { scryptSync } from 'node:crypto';
import { config, modifiedPeriod, searchQuery } from '../core.mjs';
import { createApp } from '../server.mjs';
import { UserStore } from '../users.mjs';
const password='synthetic-date-password',salt='3'.repeat(32);
const cfgBase=config({NEXUS_ADMIN_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),NEXUS_ROOTS:JSON.stringify([{path:'C:\\ExampleData'}])});
test('period validates real calendar days, leap years, bounds and rejects operator injection',()=>{
 const period=p=>modifiedPeriod(new URLSearchParams(p));
 assert.deepEqual(period({}).terms,[]);
 assert.deepEqual(period({modifiedFrom:'2024-02-29'}).terms,['dm:>=2024-02-29']);
 assert.deepEqual(period({modifiedTo:'2026-10-26'}).terms,['dm:<=2026-10-26']);
 assert.deepEqual(period({modifiedFrom:'2026-10-26',modifiedTo:'2026-10-26'}).terms,['dm:2026-10-26..2026-10-26']);
 assert.deepEqual(period({modifiedFrom:'1601-01-01',modifiedTo:'9999-12-31'}).terms,['dm:1601-01-01..9999-12-31']);
 for(const value of ['2025-02-29','2026-04-31','2026-13-01','2026-00-01','2026-10-00','26/10/2026','2026-1-01','2026-10-26 | *','2026-10-26T23:59:59','0000-01-01','1600-12-31','10000-01-01']){
  for(const key of ['modifiedFrom','modifiedTo'])assert.throws(()=>period({[key]:value}),e=>e.status===400,value);
 }
 assert.throws(()=>period({modifiedFrom:'2026-10-27',modifiedTo:'2026-10-26'}),e=>e.status===400);
 const query=searchQuery(new URLSearchParams({q:'budget',ext:'pdf',modifiedFrom:'2026-01-01',modifiedTo:'2026-12-31',offset:25}),cfgBase);
 assert.match(query.url.searchParams.get('search'),/ext:pdf dm:2026-01-01\.\.2026-12-31$/);
 assert.equal(query.offset,25);assert.equal(query.url.origin,'http://127.0.0.1:8888');
});
test('period is sent before paging with per-user scope; tree ignores dates and invalid periods never reach upstream',async t=>{
 const users=new UserStore(),cfg={...cfgBase,port:31378};
 await users.save({username:'dateuser',name:'Date test',password,active:true,downloads:false,paths:['C:\\ExampleData\\Allowed']},cfg);
 const rows=[{name:'Before.txt',path:'C:\\ExampleData\\Allowed',type:'file',date:'2026-09-30T23:59:59'},
 ...Array.from({length:30},(_,i)=>({name:'Sample'+String(i).padStart(2,'0')+'.txt',path:'C:\\ExampleData\\Allowed\\Nested',type:'file',date:i===0?'2026-10-01T00:00:00':'2026-10-26T23:59:59'})),
 {name:'After.txt',path:'C:\\ExampleData\\Allowed',type:'file',date:'2026-10-27T00:00:00'},
 {name:'Nested',path:'C:\\ExampleData\\Allowed',type:'folder',date:'2020-01-01T12:00:00'},
 {name:'Private.txt',path:'C:\\ExampleData\\Other',type:'file',date:'2026-10-26T12:00:00'}];
 let calls=0,lastQuery='';
 const app=createApp(cfg,{users,fetcher:async url=>{
  calls++;lastQuery=url.searchParams.get('search');
  const regexes=[...lastQuery.matchAll(/regex:"([^"]+)"/g)].map(m=>new RegExp(m[1],'i'));
  const range=lastQuery.match(/dm:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/),lower=lastQuery.match(/dm:>=(\d{4}-\d{2}-\d{2})/),upper=lastQuery.match(/dm:<=(\d{4}-\d{2}-\d{2})/);
  const from=range?.[1]||lower?.[1]||'',to=range?.[2]||upper?.[1]||'9999-12-31';
  const found=rows.filter(r=>regexes.every(re=>re.test(path.win32.join(r.path,r.name)))&&(!lastQuery.includes('folder:')||r.type==='folder')&&r.date.slice(0,10)>=from&&r.date.slice(0,10)<=to);
  const offset=Number(url.searchParams.get('offset')),count=Number(url.searchParams.get('count'));
  return new Response(JSON.stringify({totalResults:found.length,results:found.slice(offset,offset+count)}));
 }});
 await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(cfg.port,'127.0.0.1',resolve);});
 t.after(()=>new Promise(r=>{app.closeAllConnections();app.close(r);}));
 const origin='http://127.0.0.1:'+cfg.port;
 const login=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin},body:JSON.stringify({username:'dateuser',password})});
 assert.equal(login.status,200);const headers={Cookie:login.headers.get('set-cookie').split(';')[0]};
 const request=(p={},route='/api/search')=>fetch(origin+route+'?'+new URLSearchParams(p),{headers});
 const params={folder:'C:\\ExampleData\\Allowed',view:'subtree',modifiedFrom:'2026-10-01',modifiedTo:'2026-10-26'};
 const response=await request(params);assert.equal(response.status,200);const first=await response.json();assert.equal(first.total,30);assert.equal(first.items.length,25);assert.equal(first.items[0].name,'Sample00.txt');assert(!lastQuery.includes('Other'));
 const second=await(await request({...params,offset:25})).json();assert.equal(second.total,30);assert.equal(second.items.length,5);assert.equal(second.items[4].name,'Sample29.txt');
 assert.equal((await(await request({modifiedFrom:'2026-10-27'})).json()).total,1);
 assert.equal((await(await request({modifiedTo:'2026-09-30'})).json()).total,2);
 const before=calls;assert.equal((await request({...params,modifiedFrom:'2026-10-27'})).status,400);assert.equal((await request({...params,modifiedTo:'2026-02-30'})).status,400);assert.equal(calls,before);
 assert.equal((await request({...params,folder:'C:\\ExampleData\\Other'})).status,403);assert.equal(calls,before);
 const tree=await(await request({...params,modifiedFrom:'invalid'},'/api/folders')).json();assert.equal(tree.total,1);assert.equal(tree.items[0].name,'Nested');assert(!lastQuery.includes('dm:'));
});
