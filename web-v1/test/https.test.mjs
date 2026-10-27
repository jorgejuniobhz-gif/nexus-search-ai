import {test} from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate,scryptSync} from 'node:crypto';
import {request} from 'node:https';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {generateLocalCertificate,verifyLocalCertificate} from '../scripts/local-certificate.mjs';
import {setupHttps,updateEnv} from '../scripts/setup-https.mjs';
import {config} from '../core.mjs';
import {createApp} from '../server.mjs';
test('HTTPS helper preserves accounts/configuration and serves verified TLS without disabling trust checks',async t=>{
 const fs=await import('node:fs/promises'),root=await fs.mkdtemp(path.join(process.cwd(),'.nexus-test-https-'));
 let server,certFiles=[];t.after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}for(const f of certFiles)await fs.unlink(f).catch(()=>{});await fs.rmdir(path.join(root,'data','tls')).catch(()=>{});await fs.unlink(path.join(root,'data','users.json')).catch(()=>{});await fs.rmdir(path.join(root,'data')).catch(()=>{});for(const f of await fs.readdir(root))await fs.unlink(path.join(root,f));await fs.rmdir(root);});
 const salt='4'.repeat(32),hash=salt+':'+scryptSync('synthetic-only-password',salt,64).toString('hex');
 const original=`NEXUS_MODE='admin-local'\nNEXUS_PORT='3000'\nNEXUS_HOST='127.0.0.1'\nNEXUS_ADMIN_HASH='${hash}'\nNEXUS_ROOTS='[{"path":"C:\\\\ExampleData"}]'\nNEXUS_DOWNLOADS='true'\n`;
 await fs.writeFile(path.join(root,'.env'),original);await fs.mkdir(path.join(root,'data'));const usersText='synthetic accounts preserved';await fs.writeFile(path.join(root,'data','users.json'),usersText);
 let secured=0;const result=await setupHttps(root,{hostname:'nexus-test',port:31377,secure:async()=>secured++});assert.equal(secured,1);assert.equal(await fs.readFile(result.backup,'utf8'),original);assert.equal(await fs.readFile(path.join(root,'data','users.json'),'utf8'),usersText);
 const raw=await fs.readFile(path.join(root,'.env'),'utf8'),env=parseEnv(raw);assert.equal(env.NEXUS_ADMIN_HASH,hash);assert.equal(env.NEXUS_DOWNLOADS,'true');assert.equal(env.NEXUS_PUBLIC_ORIGIN,'https://nexus-test:31377');assert(!raw.includes('PRIVATE KEY'));
 const certPath=env.NEXUS_TLS_CERT,keyPath=env.NEXUS_TLS_KEY;certFiles=[certPath,keyPath,result.caFile];const ca=await fs.readFile(result.caFile),cert=await fs.readFile(certPath),key=await fs.readFile(keyPath);const leaf=new X509Certificate(cert),authority=new X509Certificate(ca);assert(leaf.verify(authority.publicKey));assert.equal(leaf.checkHost('other-name'),undefined);assert.throws(()=>verifyLocalCertificate('other-name',ca,cert,key));assert(!key.toString().includes('CA PRIVATE'));
 server=createApp(config(env));await new Promise((r,j)=>{server.once('error',j);server.listen(31377,'127.0.0.1',r);});
 function get(trusted){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:31377,path:'/',servername:'nexus-test',headers:{Host:'nexus-test:31377'},...(trusted?{ca:authority.toString()}: {})},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text,authorized:res.socket?.authorized}));});req.on('error',reject);req.end();});}
 await assert.rejects(()=>get(false));const response=await get(true);assert.equal(response.status,200);assert(response.text.includes('Nexus Search AI'));
 const sameCert=await fs.readFile(certPath);await setupHttps(root,{hostname:'nexus-test',port:31377,secure:async()=>{}});assert((await fs.readFile(certPath)).equals(sameCert));
 const before=await fs.readFile(path.join(root,'.env'),'utf8');await assert.rejects(()=>setupHttps(root,{hostname:'other-name',port:31377,secure:async()=>{}}));assert.equal(await fs.readFile(path.join(root,'.env'),'utf8'),before);
});
test('HTTPS environment edit replaces duplicate target keys and preserves unrelated values',()=>{
 const result=updateEnv("# comment\nNEXUS_PORT=3000\nexport NEXUS_PORT=3001\nSECRET='keep-me'\n",{NEXUS_PORT:'3443',NEXUS_MODE:'accounts'});assert.equal((result.match(/NEXUS_PORT=/g)||[]).length,1);assert.equal(parseEnv(result).SECRET,'keep-me');assert.equal(parseEnv(result).NEXUS_PORT,'3443');assert.throws(()=>generateLocalCertificate('not/a/name'));assert.throws(()=>generateLocalCertificate('192.0.2.1'));
});
