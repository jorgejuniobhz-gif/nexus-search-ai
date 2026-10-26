import { generateKeyPairSync, createHash, randomBytes, sign, X509Certificate, createPrivateKey } from 'node:crypto';
const join=(...parts)=>Buffer.concat(parts);
function der(tag,value){const b=Buffer.from(value);let n=b.length,len=n<128?Buffer.from([n]):Buffer.from(n.toString(16).padStart(Math.ceil(n.toString(16).length/2)*2,'0'),'hex');if(n>=128)len=join(Buffer.from([0x80|len.length]),len);return join(Buffer.from([tag]),len,b);}
const seq=(...parts)=>der(0x30,join(...parts)),set=(...parts)=>der(0x31,join(...parts));
function integer(value){let b=Buffer.isBuffer(value)?value:Buffer.from([value]);while(b.length>1&&b[0]===0)b=b.subarray(1);if(b[0]&128)b=join(Buffer.from([0]),b);return der(2,b);}
function oid(s){const parts=s.split('.').map(Number);const numbers=[40*parts[0]+parts[1],...parts.slice(2)],bytes=[];for(let n of numbers){const chunk=[n&127];while(n>=128){n=Math.floor(n/128);chunk.unshift((n&127)|128);}bytes.push(...chunk);}return der(6,Buffer.from(bytes));}
const name=cn=>seq(set(seq(oid('2.5.4.3'),der(12,Buffer.from(cn)))));
const octet=b=>der(4,b),bits=(b,unused=0)=>der(3,join(Buffer.from([unused]),b));
const alg=()=>seq(oid('1.2.840.113549.1.1.11'),der(5,Buffer.alloc(0)));
function time(date){return der(0x17,Buffer.from(date.toISOString().replace(/\D/g,'').slice(2,14)+'Z'));}
const extension=(id,value,critical=false)=>seq(oid(id),...(critical?[der(1,Buffer.from([255]))]:[]),octet(value));
const pem=(type,b)=>`-----BEGIN ${type}-----\n${b.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END ${type}-----\n`;
export function validDnsName(s){return typeof s==='string'&&s.length<=253&&s.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))&&!/^\d+(\.\d+){3}$/.test(s);}
export function generateLocalCertificate(hostname){
 if(!validDnsName(hostname))throw Error('Nome DNS inválido.');hostname=hostname.toLowerCase();
 const ca=generateKeyPairSync('rsa',{modulusLength:3072}),server=generateKeyPairSync('rsa',{modulusLength:3072});
 const keyId=key=>createHash('sha1').update(key.export({type:'pkcs1',format:'der'})).digest();
 const caId=keyId(ca.publicKey),serverId=keyId(server.publicKey),issuer=name('Nexus Local CA '+randomBytes(6).toString('hex'));
 const before=new Date(Date.now()-86400000),caAfter=new Date(Date.now()+5*365*86400000),after=new Date(Date.now()+365*86400000);
 function cert(subject,publicKey,privateKey,expires,extensions){const tbs=seq(der(0xa0,integer(2)),integer(randomBytes(16)),alg(),issuer,seq(time(before),time(expires)),subject,publicKey.export({type:'spki',format:'der'}),der(0xa3,seq(...extensions)));return seq(tbs,alg(),bits(sign('sha256',tbs,privateKey)));}
 const caDer=cert(issuer,ca.publicKey,ca.privateKey,caAfter,[extension('2.5.29.19',seq(der(1,Buffer.from([255])),integer(0)),true),extension('2.5.29.15',bits(Buffer.from([6]),1),true),extension('2.5.29.14',octet(caId))]);
 const serverDer=cert(name(hostname),server.publicKey,ca.privateKey,after,[extension('2.5.29.19',seq(),true),extension('2.5.29.15',bits(Buffer.from([0xa0]),5),true),extension('2.5.29.37',seq(oid('1.3.6.1.5.5.7.3.1'))),extension('2.5.29.17',seq(der(0x82,Buffer.from(hostname)))),extension('2.5.29.14',octet(serverId)),extension('2.5.29.35',seq(der(0x80,caId)))]);
 const root=new X509Certificate(caDer),leaf=new X509Certificate(serverDer);
 if(!root.ca||leaf.ca||!root.verify(root.publicKey)||!leaf.verify(root.publicKey)||!leaf.checkHost(hostname)||!leaf.checkPrivateKey(server.privateKey))throw Error('Falha na validação do certificado.');
 // The CA signing key is intentionally not exported or saved.
 return {caPem:pem('CERTIFICATE',caDer),caDer,certPem:pem('CERTIFICATE',serverDer),keyPem:server.privateKey.export({type:'pkcs8',format:'pem'}),fingerprint:root.fingerprint256,expires:leaf.validTo};
}
export function verifyLocalCertificate(hostname,caPem,certPem,keyPem){const root=new X509Certificate(caPem),leaf=new X509Certificate(certPem);if(!root.ca||leaf.ca||!leaf.verify(root.publicKey)||!leaf.checkHost(hostname)||!leaf.checkPrivateKey(createPrivateKey(keyPem))||Date.parse(leaf.validTo)<Date.now()+86400000)throw Error('Certificado existente inválido, de outro nome ou próximo do vencimento. Não foi substituído.');return {fingerprint:root.fingerprint256,expires:leaf.validTo};}
